/**
 * Exports extracted employee payout data to a clean, single-sheet Excel workbook.
 * Contains the required payout columns in Iraqi Dinar (IQD) directly.
 */

import * as XLSX from 'xlsx';
import { EmployeePayoutRecord } from '../types/excelIncentives';

export function exportExtractedDataToExcel(
  records: EmployeePayoutRecord[],
  filename = 'Extracted_Incentives_Payout_IQD.xlsx'
): void {
  // Format rows directly in IQD (Iraqi Dinar) as imported, without exchange rate conversion
  const exportRows = records.map((rec) => {
    const incIQD = rec.incentives !== null ? rec.incentives : 0;
    const transIQD = rec.transportation !== null ? rec.transportation : 0;
    const bonusIQD = rec.bonus !== null ? rec.bonus : 0;
    const totalIQD = incIQD + transIQD + bonusIQD;
    return {
      'SystemID / WAID': rec.employeeId,
      'Office': rec.office,
      'Employee Name': rec.employeeName,
      'Job Title': rec.jobTitle,
      'Incentives (د.ع IQD)': rec.incentives !== null ? rec.incentives : '—',
      'Transportation (د.ع IQD)': rec.transportation !== null ? rec.transportation : '—',
      'Bonus (د.ع IQD)': rec.bonus !== null ? rec.bonus : '—',
      'Total (د.ع IQD)': totalIQD > 0 ? totalIQD : '—',
      'Currency': 'IQD'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportRows);

  // Set clean column widths for readability
  worksheet['!cols'] = [
    { wch: 18 }, // SystemID / WAID
    { wch: 22 }, // Office
    { wch: 30 }, // Employee Name
    { wch: 28 }, // Job Title
    { wch: 20 }, // Incentives
    { wch: 20 }, // Transportation
    { wch: 20 }, // Bonus
    { wch: 20 }, // Total
    { wch: 12 }, // Currency
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payout Extracted IQD');

  // Trigger browser download
  XLSX.writeFile(workbook, filename);
}
