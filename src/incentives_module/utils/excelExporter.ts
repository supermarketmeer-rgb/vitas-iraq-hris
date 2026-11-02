/**
 * Exports extracted employee payout data to a clean, single-sheet Excel workbook.
 * Contains ONLY the 7 required columns:
 * Employee ID, Office, Employee Name, Job Title, Incentives, Transportation, Bonus
 */

import * as XLSX from 'xlsx';
import { EmployeePayoutRecord } from '../types/excelIncentives';

export function exportExtractedDataToExcel(
  records: EmployeePayoutRecord[],
  filename = 'Extracted_Incentives_Payout_USD.xlsx',
  fxRate = 1310
): void {
  // Format rows with both USD amounts and IQD conversion based on official Policy rate
  const exportRows = records.map((rec) => {
    const incUSD = rec.incentives !== null ? rec.incentives : 0;
    const transUSD = rec.transportation !== null ? rec.transportation : 0;
    const bonusUSD = rec.bonus !== null ? rec.bonus : 0;
    const totalUSD = incUSD + transUSD + bonusUSD;
    return {
      'Employee ID': rec.employeeId,
      'Office': rec.office,
      'Employee Name': rec.employeeName,
      'Job Title': rec.jobTitle,
      'Incentives ($ USD)': rec.incentives !== null ? rec.incentives : '—',
      'Transportation ($ USD)': rec.transportation !== null ? rec.transportation : '—',
      'Bonus ($ USD)': rec.bonus !== null ? rec.bonus : '—',
      'Total ($ USD)': totalUSD > 0 ? totalUSD : '—',
      'Total in IQD (الدينار العراقي)': totalUSD > 0 ? Math.round(totalUSD * fxRate) : 0,
      'Applied FX Rate': fxRate,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set clean column widths for readability
  worksheet['!cols'] = [
    { wch: 16 }, // Employee ID
    { wch: 22 }, // Office
    { wch: 30 }, // Employee Name
    { wch: 28 }, // Job Title
    { wch: 18 }, // Incentives
    { wch: 18 }, // Transportation
    { wch: 18 }, // Bonus
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payout Extracted');

  // Trigger browser download
  XLSX.writeFile(workbook, filename);
}
