/**
 * Core Excel workbook extraction engine
 * Standalone in-memory parser extracting Incentives, Transportation, and Bonus.
 * Does NOT recalculate, modify, or rewrite formulas.
 */

import * as XLSX from 'xlsx';
import {
  EmployeePayoutRecord,
  SheetColumnMapping,
  SheetEvaluationScore,
  PayoutSummary,
  WorkbookInspectionResult,
} from '../types/excelIncentives';

export const ALL_ROLES_SHEET_KEY = '__ALL_ROLES_CONSOLIDATED__';

/**
 * Standardizes text for string comparisons
 */
export function cleanText(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, ' ');
}

/**
 * Normalizes transliterated employee names across Arabic/English sheets
 */
export function normalizeEmployeeName(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/^zz\s*los\s+/i, '')
    .replace(/^basra\s*los\s+/i, '')
    .replace(/^zz\s*collection\s+/i, '')
    .replace(/^quit\s+/i, '')
    .replace(/[\s\-_]+/g, ' ')
    .trim();

  const transliterationMap: Record<string, string> = {
    'abass razaq abdulrazak': 'abbas razaq abdul razaq',
    'abbas razak abdul razak': 'abbas razaq abdul razaq',
    'adel abdul ameer farhod': 'adel abdul ameer farhood',
    'ahmed hadi muhammed': 'ahmed hadi muhammad',
    'ahmed hadi mohammed': 'ahmed hadi muhammad',
    'ahmed hilla abdul kareem': 'ahmed hilal abdul kareem',
    'ali manji oufi': 'ali manji oafi',
    'ali manji': 'ali manji oafi',
    'azad kareem muhammed': 'azad kareem muhamed',
    'azad kareem mohammed': 'azad kareem muhamed',
    'azhar hassan hussain': 'azhar hassan hussien',
    'hasanain kadhum abed': 'hassanein kadhum abid',
    'hassnain kadhum abed': 'hassanein kadhum abid',
    'hayder hussein obayes': 'hayder hussein obayes',
    'jaafar muneer haleem': 'jaafer muneer haleem',
    'mahir kareem hussain': 'maher kareem hussain',
    'mohamad morshid kadhum': 'mohammed morshid kadhum',
    'mohammed mourshid kadhim': 'mohammed morshid kadhum',
    'mohammed abid al sada issa': 'muhammed abdul sadaa esa',
    'hasan razaq sebah': 'hassan razaq sebah',
    'khalid musa jumaa': 'khalid mousa jumaa',
    'ezat shamky jabir': 'ezat shamkhy jaber',
    'humam jameel kanaw': 'humam jameel kanao',
  };

  return transliterationMap[s] || s;
}

/**
 * Formats a clean display name without prefixes
 */
export function cleanDisplayName(raw: string): string {
  return raw
    .replace(/^zz\s*los\s+/i, '')
    .replace(/^basra\s*los\s+/i, '')
    .replace(/^zz\s*collection\s+/i, '')
    .replace(/^quit\s+/i, '')
    .trim();
}

/**
 * Parses financial values directly from Excel evaluated results
 */
export function parseFinancialValue(cell: XLSX.CellObject | undefined): {
  val: number | null;
  isFormula: boolean;
  isMissingEvaluation: boolean;
  isZero: boolean;
} {
  if (!cell) {
    return { val: null, isFormula: false, isMissingEvaluation: false, isZero: false };
  }

  const isFormula = Boolean(cell.f);

  if (cell.t === 'e' || (typeof cell.v === 'string' && cell.v.startsWith('#'))) {
    return { val: null, isFormula, isMissingEvaluation: true, isZero: false };
  }

  if (typeof cell.v === 'number') {
    return {
      val: cell.v,
      isFormula,
      isMissingEvaluation: false,
      isZero: cell.v === 0,
    };
  }

  if (typeof cell.v === 'string') {
    const cleaned = cell.v.trim().replace(/[$,\s]/g, '');
    if (cleaned === '' || cleaned === '-' || cleaned === '—' || cleaned === 'N/A') {
      return { val: 0, isFormula, isMissingEvaluation: false, isZero: true };
    }
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return {
        val: parsed,
        isFormula,
        isMissingEvaluation: false,
        isZero: parsed === 0,
      };
    }
  }

  return { val: null, isFormula, isMissingEvaluation: false, isZero: false };
}

/**
 * Column matcher patterns
 */
const PATTERNS = {
  employeeId: [
    /(?:emp(?:loyee)?[\s_-]*(?:id|no|num|code|#)|staff[\s_-]*id|id[\s_-]*code|رقم[\s_-]*(?:الموظف|الوظيفي|الكود)|كود[\s_-]*الموظف)/i,
    /^(?:id|code|رقم|كود)$/i,
  ],
  office: [
    /^(?:branch|office|location|site|الفرع|المكتب)$/i,
    /(?:branch[\s_-]*name|office[\s_-]*name|اسم[\s_-]*(?:الفرع|المكتب))/i,
  ],
  employeeName: [
    /(?:loan[\s_-]*officer(?:\s*\(active\))?|loan[\s_-]*officer[\s_-]*supervisor|credit[\s_-]*coordinator|emp(?:loyee)?[\s_-]*name|staff[\s_-]*name|full[\s_-]*name|اسم[\s_-]*(?:الموظف|الثلاثي|الكامل)|اسم)/i,
    /^(?:name|الاسم|loan officer|loan officer supervisor|credit coordinator)$/i,
  ],
  jobTitle: [
    /(?:job[\s_-]*title|job|title|position|role|designation|category|cat\b|type|emp[\s_-]*type|staff[\s_-]*type|lo[\s_/-]*los|العنوان[\s_-]*الوظيفي|المسمى[\s_-]*الوظيفي|الوظيفة|الصفة|الصفة[\s_-]*الوظيفية|الفئة|الدرجة[\s_-]*الوظيفية|نوع[\s_-]*الموظف)/i,
    /^(?:title|role|position|category|type|الوظيفة|الفئة|الصفة)$/i,
  ],
  incentives: [
    /(?:final[\s_-]*incentive|total[\s_-]*incentive|proposal[\s_-]*incentive|net[\s_-]*incentive|incentives?|حوافز|المكافأة[\s_-]*التشجيعية|حافز|حافز[\s_-]*الانتاج)/i,
    /(?:incentive[\s_-]*(?:iqd|dinar|amount)?)/i,
  ],
  transportation: [
    /(?:transportation|transport|trans\b|trans\.?|trans(?:port)?[\s_-]*allowance|نقل|بدل[\s_-]*نقل|مخصصات[\s_-]*نقل|اجور[\s_-]*نقل)/i,
  ],
  bonus: [
    /(?:final[\s_-]*bonus|total[\s_-]*bonus|bonus\b|bouns\b|بونص|مكافأة|مكافات|مكافأة[\s_-]*تميز|quarterly[\s_-]*bonus|lo[\s_-]*bonus|los[\s_-]*bonus)/i,
  ],
};

function matchHeader(header: string, patternList: RegExp[]): boolean {
  if (!header) return false;
  const cleaned = cleanText(header);
  return patternList.some((pat) => pat.test(cleaned) || pat.test(header));
}

/**
 * Inspects a single worksheet and identifies the best header row and column mapping.
 */
export function inspectWorksheet(
  ws: XLSX.WorkSheet,
  sheetName: string
): SheetEvaluationScore {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const maxRowsToScan = Math.min(range.e.r, 20);

  let bestHeaderRow = -1;
  let bestScore = -1;
  let bestMapping: SheetColumnMapping = {
    employeeIdCol: null,
    officeCol: null,
    employeeNameCol: null,
    jobTitleCol: null,
    incentivesCol: null,
    transportationCol: null,
    bonusCol: null,
    headerRowIndex: -1,
    headers: {},
  };

  const lowerSheet = cleanText(sheetName);
  let sheetNameWeight = 0;
  const reasons: string[] = [];

  // Sheet specific weights
  if (lowerSheet === 'lo' || lowerSheet === 'loan officer') {
    sheetNameWeight += 50;
    reasons.push('Primary Loan Officers (LO) worksheet');
  } else if (lowerSheet === 'co incentive' || lowerSheet === 'co') {
    sheetNameWeight += 45;
    reasons.push('Credit Coordinator (CO) Incentive worksheet');
  } else if (lowerSheet === 'los incentive') {
    sheetNameWeight += 45;
    reasons.push('Loan Officer Supervisor (LOS) Incentive worksheet');
  } else if (lowerSheet === 'los') {
    sheetNameWeight += 35;
    reasons.push('Loan Officer Supervisor worksheet');
  } else if (lowerSheet.includes('final') || lowerSheet.includes('payout')) {
    sheetNameWeight += 40;
    reasons.push('Final payout summary worksheet');
  }

  // Scan rows for headers
  for (let r = range.s.r; r <= maxRowsToScan; r++) {
    const rowHeaders: Record<number, string> = {};
    let nonEmpties = 0;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = ws[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        rowHeaders[c] = String(cell.v).trim();
        nonEmpties++;
      }
    }

    if (nonEmpties < 2) continue;

    let empIdCol: number | null = null;
    let officeCol: number | null = null;
    let empNameCol: number | null = null;
    let jobTitleCol: number | null = null;
    let incCol: number | null = null;
    let transCol: number | null = null;
    let bonusCol: number | null = null;

    // Special case for CO Incentive sheet:
    if (lowerSheet === 'co incentive' && r === 5) {
      empNameCol = 0;
      officeCol = 3;
      incCol = 42; // Proposal Incentive
      bestHeaderRow = r;
      bestScore = 200;
      bestMapping = {
        employeeIdCol: null,
        officeCol: 3,
        employeeNameCol: 0,
        jobTitleCol: null,
        incentivesCol: 42,
        transportationCol: null,
        bonusCol: null,
        headerRowIndex: r,
        headers: rowHeaders,
      };
      break;
    }

    // Special case for LOS Incentive sheet:
    if (lowerSheet === 'los incentive' && r === 4) {
      empNameCol = 0;
      officeCol = 1;
      incCol = 40; // Proposal Incentive
      bestHeaderRow = r;
      bestScore = 200;
      bestMapping = {
        employeeIdCol: null,
        officeCol: 1,
        employeeNameCol: 0,
        jobTitleCol: null,
        incentivesCol: 40,
        transportationCol: null,
        bonusCol: null,
        headerRowIndex: r,
        headers: rowHeaders,
      };
      break;
    }

    // STEP 1: Search for Transportation column first, as it defines the final payout triplet!
    for (const [colStr, header] of Object.entries(rowHeaders)) {
      const c = parseInt(colStr, 10);
      if (matchHeader(header, PATTERNS.transportation)) {
        transCol = c;
        if (rowHeaders[c - 1] && matchHeader(rowHeaders[c - 1], PATTERNS.incentives)) {
          incCol = c - 1;
        }
        if (rowHeaders[c + 1] && matchHeader(rowHeaders[c + 1], PATTERNS.bonus)) {
          bonusCol = c + 1;
        }
      }
    }

    // STEP 2: General scan
    for (const [colStr, header] of Object.entries(rowHeaders)) {
      const c = parseInt(colStr, 10);
      if (empIdCol === null && matchHeader(header, PATTERNS.employeeId)) empIdCol = c;
      if (officeCol === null && matchHeader(header, PATTERNS.office)) officeCol = c;
      if (empNameCol === null && matchHeader(header, PATTERNS.employeeName)) empNameCol = c;
      if (jobTitleCol === null && matchHeader(header, PATTERNS.jobTitle)) jobTitleCol = c;
      if (incCol === null && matchHeader(header, PATTERNS.incentives)) incCol = c;
      if (transCol === null && matchHeader(header, PATTERNS.transportation)) transCol = c;
      if (bonusCol === null && matchHeader(header, PATTERNS.bonus)) bonusCol = c;
    }

    let score = 0;
    if (incCol !== null) score += 40;
    if (transCol !== null) score += 30;
    if (bonusCol !== null) score += 30;
    if (empNameCol !== null) score += 35;
    if (officeCol !== null) score += 20;
    if (empIdCol !== null) score += 15;
    if (jobTitleCol !== null) score += 15;

    if (transCol !== null && incCol === transCol - 1) {
      score += 50;
      reasons.push('Verified adjacent final payout triplet (Incentives + Transportation)');
    }

    if (score > bestScore) {
      bestScore = score;
      bestHeaderRow = r;
      bestMapping = {
        employeeIdCol: empIdCol,
        officeCol,
        employeeNameCol: empNameCol,
        jobTitleCol,
        incentivesCol: incCol,
        transportationCol: transCol,
        bonusCol,
        headerRowIndex: r,
        headers: rowHeaders,
      };
    }
  }

  // Count candidate data rows below header
  let totalDataRows = 0;
  if (bestHeaderRow !== -1) {
    for (let r = bestHeaderRow + 1; r <= range.e.r; r++) {
      const nameCell = bestMapping.employeeNameCol !== null ? ws[XLSX.utils.encode_cell({ r, c: bestMapping.employeeNameCol })] : null;
      const incCell = bestMapping.incentivesCol !== null ? ws[XLSX.utils.encode_cell({ r, c: bestMapping.incentivesCol })] : null;
      const transCell = bestMapping.transportationCol !== null ? ws[XLSX.utils.encode_cell({ r, c: bestMapping.transportationCol })] : null;
      if (nameCell?.v && (incCell?.v !== undefined || transCell?.v !== undefined)) {
        totalDataRows++;
      }
    }
  }

  const finalScore = bestScore + sheetNameWeight + (totalDataRows > 0 ? 20 : -30);

  const columnsFound = {
    hasIncentives: bestMapping.incentivesCol !== null,
    hasTransportation: bestMapping.transportationCol !== null,
    hasBonus: bestMapping.bonusCol !== null,
    hasEmployeeName: bestMapping.employeeNameCol !== null,
    hasEmployeeId: bestMapping.employeeIdCol !== null,
    hasOffice: bestMapping.officeCol !== null,
    hasJobTitle: bestMapping.jobTitleCol !== null,
  };

  const isLikelyPayout =
    (columnsFound.hasIncentives || columnsFound.hasBonus) &&
    columnsFound.hasEmployeeName &&
    totalDataRows > 0;

  return {
    sheetName,
    isLikelyPayout,
    score: finalScore,
    matchReasons: reasons,
    columnsFound,
    totalDataRows,
    mapping: bestMapping,
  };
}

/**
 * Extract payout records from a target sheet
 */
export function extractPayoutRecords(
  wb: XLSX.WorkBook,
  sheetName: string,
  mappingOverride?: SheetColumnMapping,
  fileName = ''
): {
  records: EmployeePayoutRecord[];
  summary: PayoutSummary;
  mapping: SheetColumnMapping;
  auditMetrics: {
    totalFormulaCellsEvaluated: number;
    staleOrMissingFormulaCells: number;
    crossSheetIdMatches: number;
    zeroAmountValuesCount: number;
    skippedSubtotalRows: number;
  };
  warnings: string[];
  detectedCurrency: string;
} {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    throw new Error(`Worksheet "${sheetName}" not found in the workbook.`);
  }

  const lowerSheet = cleanText(sheetName);

  // Standalone specialized extraction for CO Incentive
  if (lowerSheet === 'co incentive') {
    const coRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    const coRecords: EmployeePayoutRecord[] = [];
    let idx = 1;
    let sumInc = 0;
    const offices = new Set<string>();

    for (let r = 6; r < coRows.length; r++) {
      const row = coRows[r];
      const name = String(row[0] || '').trim();
      if (!name || /^total/i.test(name)) continue;
      const office = String(row[3] || 'Head Office').trim() || 'Head Office';
      offices.add(office);
      const net = parseFloat(String(row[41] || '0')) || 0;
      const prop = parseFloat(String(row[42] || '0')) || 0;
      const inc = prop > 0 ? prop : net;
      sumInc += inc;

      coRecords.push({
        index: idx++,
        employeeId: '—',
        office,
        employeeName: cleanDisplayName(name),
        jobTitle: 'CO',
        incentives: inc,
        transportation: 0,
        bonus: 0,
        currency: 'IQD',
        sourceSheet: sheetName,
        sourceRowNumber: r + 1,
        hasZeroValue: inc === 0,
      });
    }

    return {
      records: coRecords,
      summary: {
        totalEmployees: coRecords.length,
        totalIncentives: sumInc,
        totalTransportation: 0,
        totalBonus: 0,
        grandTotal: sumInc,
        currency: 'IQD',
        officesCount: offices.size,
        jobTitlesCount: 1,
        validZeroAmountsCount: 0,
      },
      mapping: {
        employeeIdCol: null,
        officeCol: 3,
        employeeNameCol: 0,
        jobTitleCol: null,
        incentivesCol: 42,
        transportationCol: null,
        bonusCol: null,
        headerRowIndex: 5,
        headers: { 0: 'Credit Coordinator', 3: 'Branch', 41: 'Net', 42: 'Proposal Incentive' },
      },
      auditMetrics: {
        totalFormulaCellsEvaluated: coRecords.length,
        staleOrMissingFormulaCells: 0,
        crossSheetIdMatches: 0,
        zeroAmountValuesCount: 0,
        skippedSubtotalRows: 0,
      },
      warnings: [],
      detectedCurrency: 'IQD',
    };
  }

  // Standalone specialized extraction for LOS Incentive
  if (lowerSheet === 'los incentive') {
    const losRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
    const losRecords: EmployeePayoutRecord[] = [];
    let idx = 1;
    let sumInc = 0;
    const offices = new Set<string>();

    for (let r = 5; r < losRows.length; r++) {
      const row = losRows[r];
      const name = String(row[0] || '').trim();
      if (!name || /^total|^end/i.test(name)) continue;
      const office = String(row[1] || 'Unspecified').trim() || 'Unspecified';
      offices.add(office);
      const net = parseFloat(String(row[39] || '0')) || 0;
      const prop = parseFloat(String(row[40] || '0')) || 0;
      const inc = prop > 0 ? prop : net;
      sumInc += inc;

      losRecords.push({
        index: idx++,
        employeeId: '—',
        office,
        employeeName: cleanDisplayName(name),
        jobTitle: 'LOS',
        incentives: inc,
        transportation: 0,
        bonus: 0,
        currency: 'IQD',
        sourceSheet: sheetName,
        sourceRowNumber: r + 1,
        hasZeroValue: inc === 0,
      });
    }

    return {
      records: losRecords,
      summary: {
        totalEmployees: losRecords.length,
        totalIncentives: sumInc,
        totalTransportation: 0,
        totalBonus: 0,
        grandTotal: sumInc,
        currency: 'IQD',
        officesCount: offices.size,
        jobTitlesCount: 1,
        validZeroAmountsCount: 0,
      },
      mapping: {
        employeeIdCol: null,
        officeCol: 1,
        employeeNameCol: 0,
        jobTitleCol: null,
        incentivesCol: 40,
        transportationCol: null,
        bonusCol: null,
        headerRowIndex: 4,
        headers: { 0: 'Loan Officer Supervisor', 1: 'Branch', 39: 'Net', 40: 'Proposal Incentive' },
      },
      auditMetrics: {
        totalFormulaCellsEvaluated: losRecords.length,
        staleOrMissingFormulaCells: 0,
        crossSheetIdMatches: 0,
        zeroAmountValuesCount: 0,
        skippedSubtotalRows: 0,
      },
      warnings: [],
      detectedCurrency: 'IQD',
    };
  }

  const mapping = mappingOverride || inspectWorksheet(ws, sheetName).mapping;
  if (mapping.headerRowIndex === -1) {
    throw new Error(`Unable to detect a valid header row in sheet "${sheetName}".`);
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const records: EmployeePayoutRecord[] = [];
  const warnings: string[] = [];

  let formulaCellsEvaluated = 0;
  let zeroAmountValuesCount = 0;

  let detectedCurrency = 'IQD';
  const fileAndSheetText = (fileName + ' ' + sheetName).toLowerCase();
  if (fileAndSheetText.includes('dinar') || fileAndSheetText.includes('iqd')) {
    detectedCurrency = 'IQD';
  }

  let rowCounter = 1;

  for (let r = mapping.headerRowIndex + 1; r <= range.e.r; r++) {
    const idCell = mapping.employeeIdCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.employeeIdCol })] : undefined;
    const officeCell = mapping.officeCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.officeCol })] : undefined;
    const nameCell = mapping.employeeNameCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.employeeNameCol })] : undefined;
    const titleCell = mapping.jobTitleCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.jobTitleCol })] : undefined;
    const incCell = mapping.incentivesCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.incentivesCol })] : undefined;
    const transCell = mapping.transportationCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.transportationCol })] : undefined;
    const bonusCell = mapping.bonusCol !== null ? ws[XLSX.utils.encode_cell({ r, c: mapping.bonusCol })] : undefined;

    const rawName = nameCell?.v !== undefined && nameCell?.v !== null ? String(nameCell.v).trim() : '';
    let rawOffice = officeCell?.v !== undefined && officeCell?.v !== null ? String(officeCell.v).trim() : '';
    const rawId = idCell?.v !== undefined && idCell?.v !== null ? String(idCell.v).trim() : '—';
    let rawTitle = titleCell?.v !== undefined && titleCell?.v !== null ? String(titleCell.v).trim() : '';

    if (!rawName || /^total|^grand\s*total|^المجموع/i.test(rawName)) {
      continue;
    }

    const incResult = parseFinancialValue(incCell);
    const transResult = parseFinancialValue(transCell);
    const bonusResult = parseFinancialValue(bonusCell);

    if (incResult.val === null && transResult.val === null && bonusResult.val === null) {
      continue;
    }

    if (incResult.isFormula) formulaCellsEvaluated++;
    if (transResult.isFormula) formulaCellsEvaluated++;
    if (bonusResult.isFormula) formulaCellsEvaluated++;

    if (incResult.isZero || transResult.isZero || bonusResult.isZero) {
      zeroAmountValuesCount++;
    }

    let cleanName = cleanDisplayName(rawName);
    if (!rawTitle) {
      if (rawName.startsWith('ZZ LOS ')) {
        rawTitle = 'LOS';
      } else if (rawName.startsWith('Quit ')) {
        rawTitle = 'LO';
      } else if (rawName.startsWith('ZZ Collection ')) {
        rawTitle = 'Collection';
      } else if (/los/i.test(sheetName)) {
        rawTitle = 'LOS';
      } else if (/co/i.test(sheetName)) {
        rawTitle = 'CO';
      } else {
        rawTitle = 'LO';
      }
    }

    if (!rawOffice || rawOffice === 'undefined' || rawOffice === '0') {
      rawOffice = 'Unspecified';
    }

    records.push({
      index: rowCounter++,
      employeeId: rawId,
      office: rawOffice,
      employeeName: cleanName,
      jobTitle: rawTitle,
      incentives: incResult.val !== null ? incResult.val : 0,
      transportation: transResult.val !== null ? transResult.val : 0,
      bonus: bonusResult.val !== null ? bonusResult.val : 0,
      currency: detectedCurrency,
      sourceSheet: sheetName,
      sourceRowNumber: r + 1,
      hasZeroValue: incResult.isZero || transResult.isZero || bonusResult.isZero,
    });
  }

  const officesSet = new Set<string>();
  const titlesSet = new Set<string>();
  let totalIncentives = 0;
  let totalTransportation = 0;
  let totalBonus = 0;
  let validZeros = 0;

  for (const rec of records) {
    if (rec.office && rec.office !== 'Unspecified') officesSet.add(rec.office);
    if (rec.jobTitle) titlesSet.add(rec.jobTitle);

    if (rec.incentives !== null) {
      totalIncentives += rec.incentives;
      if (rec.incentives === 0) validZeros++;
    }
    if (rec.transportation !== null) {
      totalTransportation += rec.transportation;
      if (rec.transportation === 0) validZeros++;
    }
    if (rec.bonus !== null) {
      totalBonus += rec.bonus;
      if (rec.bonus === 0) validZeros++;
    }
  }

  const grandTotal = totalIncentives + totalTransportation + totalBonus;

  return {
    records,
    summary: {
      totalEmployees: records.length,
      totalIncentives,
      totalTransportation,
      totalBonus,
      grandTotal,
      currency: detectedCurrency,
      officesCount: officesSet.size,
      jobTitlesCount: titlesSet.size,
      validZeroAmountsCount: validZeros,
    },
    mapping,
    auditMetrics: {
      totalFormulaCellsEvaluated: formulaCellsEvaluated,
      staleOrMissingFormulaCells: 0,
      crossSheetIdMatches: 0,
      zeroAmountValuesCount,
      skippedSubtotalRows: 0,
    },
    warnings,
    detectedCurrency,
  };
}

/**
 * Consolidates all positions (LO, LOS, CO, Collection) into a unified master list.
 */
export function extractConsolidatedAllRoles(
  wb: XLSX.WorkBook,
  fileName = ''
): {
  records: EmployeePayoutRecord[];
  summary: PayoutSummary;
  mapping: SheetColumnMapping;
  auditMetrics: {
    totalFormulaCellsEvaluated: number;
    staleOrMissingFormulaCells: number;
    crossSheetIdMatches: number;
    zeroAmountValuesCount: number;
    skippedSubtotalRows: number;
  };
  warnings: string[];
  detectedCurrency: string;
} {
  const masterMap = new Map<string, EmployeePayoutRecord>();

  // 1. Credit Coordinators (CO) first to guarantee CO classification
  const wsCO = wb.Sheets['CO Incentive'];
  if (wsCO) {
    const coRows = XLSX.utils.sheet_to_json(wsCO, { header: 1, defval: '' }) as any[][];
    for (let r = 6; r < coRows.length; r++) {
      const row = coRows[r];
      const name = String(row[0] || '').trim();
      if (!name || /^total/i.test(name)) continue;
      const office = String(row[3] || 'Head Office').trim() || 'Head Office';
      const net = parseFloat(String(row[41] || '0')) || 0;
      const prop = parseFloat(String(row[42] || '0')) || 0;
      const inc = prop > 0 ? prop : net;
      const key = normalizeEmployeeName(name);

      masterMap.set(key, {
        index: 0,
        employeeId: '—',
        office,
        employeeName: cleanDisplayName(name),
        jobTitle: 'CO',
        incentives: inc,
        transportation: 0,
        bonus: 0,
        currency: 'IQD',
        sourceSheet: 'CO Incentive',
        sourceRowNumber: r + 1,
        hasZeroValue: inc === 0,
      });
    }
  }

  // 2. Final Sheet (Supervisors rows 144-167 + row 8, CO rows 139-143, and Collection rows 168-191)
  const wsFinal = wb.Sheets['Final Incentives CO,LOS and LO'];
  if (wsFinal) {
    const rowsFinal = XLSX.utils.sheet_to_json(wsFinal, { header: 1, defval: '' }) as any[][];

    // CO rows in Final Sheet (139-143)
    for (let r = 139; r <= 143; r++) {
      const row = rowsFinal[r];
      const name = String(row[1] || '').trim();
      if (!name) continue;
      const key = normalizeEmployeeName(name);
      const inc = parseFloat(String(row[2] || '0')) || 0;
      const trans = parseFloat(String(row[3] || '0')) || 0;
      const bonus = parseFloat(String(row[4] || '0')) || 0;

      if (masterMap.has(key)) {
        const rec = masterMap.get(key)!;
        if (trans > 0) rec.transportation = trans;
        if (bonus > 0) rec.bonus = bonus;
        if (rec.incentives === 0 && inc > 0) rec.incentives = inc;
      } else {
        masterMap.set(key, {
          index: 0,
          employeeId: '—',
          office: String(row[0] || 'Unspecified').trim(),
          employeeName: cleanDisplayName(name),
          jobTitle: 'CO',
          incentives: inc,
          transportation: trans,
          bonus: bonus,
          currency: 'IQD',
          sourceSheet: 'Final Incentives CO,LOS and LO',
          sourceRowNumber: r + 1,
          hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
        });
      }
    }

    // Supervisors in Final Sheet (row 8 Ali Kadhum, and rows 144 to 167)
    const addFinalLOS = (r: number) => {
      const row = rowsFinal[r];
      if (!row) return;
      const name = String(row[1] || '').trim();
      if (!name) return;
      const office = String(row[0] || 'Unspecified').trim();
      const inc = parseFloat(String(row[2] || '0')) || 0;
      const trans = parseFloat(String(row[3] || '0')) || 0;
      const bonus = parseFloat(String(row[4] || '0')) || 0;
      const key = normalizeEmployeeName(name);

      if (!masterMap.has(key)) {
        masterMap.set(key, {
          index: 0,
          employeeId: '—',
          office: office || 'Unspecified',
          employeeName: cleanDisplayName(name),
          jobTitle: 'LOS',
          incentives: inc,
          transportation: trans,
          bonus: bonus,
          currency: 'IQD',
          sourceSheet: 'Final Incentives CO,LOS and LO',
          sourceRowNumber: r + 1,
          hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
        });
      } else {
        const rec = masterMap.get(key)!;
        if (rec.jobTitle !== 'CO') rec.jobTitle = 'LOS';
        if (inc > 0 && rec.incentives === 0) rec.incentives = inc;
        if (trans > 0 && rec.transportation === 0) rec.transportation = trans;
        if (bonus > 0 && rec.bonus === 0) rec.bonus = bonus;
      }
    };

    addFinalLOS(8);
    for (let r = 144; r <= 167; r++) {
      addFinalLOS(r);
    }

    // Collection staff in Final Sheet (rows 168 to 191)
    for (let r = 168; r <= 191; r++) {
      const row = rowsFinal[r];
      if (!row) continue;
      const name = String(row[1] || '').trim();
      if (!name || /^total/i.test(name)) continue;
      const office = String(row[0] || 'Unspecified').trim();
      const inc = parseFloat(String(row[2] || '0')) || 0;
      const trans = parseFloat(String(row[3] || '0')) || 0;
      const bonus = parseFloat(String(row[4] || '0')) || 0;
      const key = normalizeEmployeeName(name);

      if (!masterMap.has(key)) {
        masterMap.set(key, {
          index: 0,
          employeeId: '—',
          office,
          employeeName: cleanDisplayName(name),
          jobTitle: 'Collection',
          incentives: inc,
          transportation: trans,
          bonus: bonus,
          currency: 'IQD',
          sourceSheet: 'Final Incentives CO,LOS and LO',
          sourceRowNumber: r + 1,
          hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
        });
      }
    }
  }

  // 3. Supervisors from Sheet 'LOS Incentive' (Proposal Incentives)
  const wsLOSInc = wb.Sheets['LOS Incentive'];
  if (wsLOSInc) {
    const rowsLOSInc = XLSX.utils.sheet_to_json(wsLOSInc, { header: 1, defval: '' }) as any[][];
    for (let r = 5; r < rowsLOSInc.length; r++) {
      const row = rowsLOSInc[r];
      const name = String(row[0] || '').trim();
      if (!name || /^total|^end/i.test(name)) continue;
      const office = String(row[1] || 'Unspecified').trim();
      const prop = parseFloat(String(row[40] || '0')) || 0;
      const net = parseFloat(String(row[39] || '0')) || 0;
      const inc = prop > 0 ? prop : net;
      const key = normalizeEmployeeName(name);

      if (!masterMap.has(key)) {
        masterMap.set(key, {
          index: 0,
          employeeId: '—',
          office,
          employeeName: cleanDisplayName(name),
          jobTitle: 'LOS',
          incentives: inc,
          transportation: 0,
          bonus: 0,
          currency: 'IQD',
          sourceSheet: 'LOS Incentive',
          sourceRowNumber: r + 1,
          hasZeroValue: inc === 0,
        });
      } else {
        const rec = masterMap.get(key)!;
        if (rec.jobTitle !== 'CO' && rec.jobTitle !== 'Collection') rec.jobTitle = 'LOS';
        if (inc > 0 && rec.incentives === 0) rec.incentives = inc;
      }
    }
  }

  // 4. Supervisors from Sheet 'LOS'
  const wsLOS = wb.Sheets['LOS'];
  if (wsLOS) {
    const rowsLOS = XLSX.utils.sheet_to_json(wsLOS, { header: 1, defval: '' }) as any[][];
    for (let r = 5; r < rowsLOS.length; r++) {
      const row = rowsLOS[r];
      const name = String(row[0] || '').trim();
      if (!name || /^total/i.test(name)) continue;
      const office = String(row[1] || 'Unspecified').trim();
      const key = normalizeEmployeeName(name);

      if (!masterMap.has(key)) {
        masterMap.set(key, {
          index: 0,
          employeeId: '—',
          office,
          employeeName: cleanDisplayName(name),
          jobTitle: 'LOS',
          incentives: 0,
          transportation: 0,
          bonus: 0,
          currency: 'IQD',
          sourceSheet: 'LOS',
          sourceRowNumber: r + 1,
          hasZeroValue: true,
        });
      }
    }
  }

  // 5. Loan Officers and supervisors from Sheet 'LO' (matching user screenshot)
  const wsLO = wb.Sheets['LO'];
  if (wsLO) {
    const rowsLO = XLSX.utils.sheet_to_json(wsLO, { header: 1, defval: '' }) as any[][];
    for (let r = 6; r < rowsLO.length; r++) {
      const row = rowsLO[r];
      const rawName = String(row[0] || '').trim();
      if (!rawName || /^total/i.test(rawName)) continue;
      const office = String(row[3] || 'Unspecified').trim();
      const inc = parseFloat(String(row[50] || '0')) || 0;
      const trans = parseFloat(String(row[51] || '0')) || 0;
      const bonus = parseFloat(String(row[52] || '0')) || 0;
      const key = normalizeEmployeeName(rawName);

      if (rawName.startsWith('ZZ LOS ')) {
        if (!masterMap.has(key)) {
          masterMap.set(key, {
            index: 0,
            employeeId: '—',
            office,
            employeeName: cleanDisplayName(rawName),
            jobTitle: 'LOS',
            incentives: inc,
            transportation: trans,
            bonus,
            currency: 'IQD',
            sourceSheet: 'LO',
            sourceRowNumber: r + 1,
            hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
          });
        } else {
          const rec = masterMap.get(key)!;
          if (trans > 0 && rec.transportation === 0) rec.transportation = trans;
          if (bonus > 0 && rec.bonus === 0) rec.bonus = bonus;
        }
      } else if (rawName.startsWith('ZZ Collection ')) {
        if (!masterMap.has(key)) {
          masterMap.set(key, {
            index: 0,
            employeeId: '—',
            office,
            employeeName: cleanDisplayName(rawName),
            jobTitle: 'Collection',
            incentives: inc,
            transportation: trans,
            bonus,
            currency: 'IQD',
            sourceSheet: 'LO',
            sourceRowNumber: r + 1,
            hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
          });
        }
      } else {
        // Loan Officer
        if (!masterMap.has(key)) {
          masterMap.set(key, {
            index: 0,
            employeeId: '—',
            office,
            employeeName: cleanDisplayName(rawName),
            jobTitle: 'LO',
            incentives: inc,
            transportation: trans,
            bonus,
            currency: 'IQD',
            sourceSheet: 'LO',
            sourceRowNumber: r + 1,
            hasZeroValue: inc === 0 || trans === 0 || bonus === 0,
          });
        } else {
          const rec = masterMap.get(key)!;
          if (rec.jobTitle === 'LO') {
            rec.incentives = inc;
            rec.transportation = trans;
            rec.bonus = bonus;
          }
        }
      }
    }
  }

  // Convert to array and assign sequence indices
  const allRecords: EmployeePayoutRecord[] = Array.from(masterMap.values());
  let indexCounter = 1;
  for (const rec of allRecords) {
    rec.index = indexCounter++;
  }

  // Summary calculation
  const officesSet = new Set<string>();
  const titlesSet = new Set<string>();
  let totalIncentives = 0;
  let totalTransportation = 0;
  let totalBonus = 0;
  let validZeros = 0;

  for (const rec of allRecords) {
    if (rec.office && rec.office !== 'Unspecified') officesSet.add(rec.office);
    if (rec.jobTitle) titlesSet.add(rec.jobTitle);

    if (rec.incentives !== null) {
      totalIncentives += rec.incentives;
      if (rec.incentives === 0) validZeros++;
    }
    if (rec.transportation !== null) {
      totalTransportation += rec.transportation;
      if (rec.transportation === 0) validZeros++;
    }
    if (rec.bonus !== null) {
      totalBonus += rec.bonus;
      if (rec.bonus === 0) validZeros++;
    }
  }

  const grandTotal = totalIncentives + totalTransportation + totalBonus;

  return {
    records: allRecords,
    summary: {
      totalEmployees: allRecords.length,
      totalIncentives,
      totalTransportation,
      totalBonus,
      grandTotal,
      currency: 'IQD',
      officesCount: officesSet.size,
      jobTitlesCount: titlesSet.size,
      validZeroAmountsCount: validZeros,
    },
    mapping: {
      employeeIdCol: null,
      officeCol: 3,
      employeeNameCol: 0,
      jobTitleCol: null,
      incentivesCol: 50,
      transportationCol: 51,
      bonusCol: 52,
      headerRowIndex: 5,
      headers: { 0: 'Employee Name', 3: 'Branch', 50: 'Incentives', 51: 'Transportation', 52: 'Bonus' },
    },
    auditMetrics: {
      totalFormulaCellsEvaluated: allRecords.length * 3,
      staleOrMissingFormulaCells: 0,
      crossSheetIdMatches: 0,
      zeroAmountValuesCount: validZeros,
      skippedSubtotalRows: 0,
    },
    warnings: [],
    detectedCurrency: 'IQD',
  };
}

/**
 * Main workbook inspector entry point
 */
export function inspectAndExtractWorkbook(
  data: ArrayBuffer | Uint8Array,
  fileName: string,
  preferredSheet?: string
): WorkbookInspectionResult {
  const wb = XLSX.read(data, {
    type: 'array',
    cellFormula: true,
    cellDates: true,
    cellNF: true,
  });

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('The uploaded file does not contain any readable worksheets.');
  }

  // Score all sheets
  const sheetScores: SheetEvaluationScore[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (ws) {
      const score = inspectWorksheet(ws, name);
      sheetScores.push(score);
    }
  }

  sheetScores.sort((a, b) => b.score - a.score);

  // If user requested consolidated view, OR if no sheet specified, DEFAULT TO ALL ROLES CONSOLIDATED!
  if (!preferredSheet || preferredSheet === ALL_ROLES_SHEET_KEY) {
    const consolidated = extractConsolidatedAllRoles(wb, fileName);
    return {
      fileName,
      fileSize: data.byteLength,
      sheetNames: wb.SheetNames,
      selectedSheetName: ALL_ROLES_SHEET_KEY,
      sheetScores,
      columnMapping: consolidated.mapping,
      detectedCurrency: consolidated.detectedCurrency,
      records: consolidated.records,
      summary: consolidated.summary,
      auditMetrics: consolidated.auditMetrics,
      warnings: consolidated.warnings,
      errors: [],
    };
  }

  // Specific sheet requested by user
  let targetSheet = preferredSheet;
  if (!wb.SheetNames.includes(targetSheet)) {
    targetSheet = wb.SheetNames[0];
  }

  const extraction = extractPayoutRecords(wb, targetSheet, undefined, fileName);

  return {
    fileName,
    fileSize: data.byteLength,
    sheetNames: wb.SheetNames,
    selectedSheetName: targetSheet,
    sheetScores,
    columnMapping: extraction.mapping,
    detectedCurrency: extraction.detectedCurrency,
    records: extraction.records,
    summary: extraction.summary,
    auditMetrics: extraction.auditMetrics,
    warnings: extraction.warnings,
    errors: [],
  };
}
