/**
 * Exports extracted employee payout data to a clean, single-sheet Excel workbook.
 * Contains ONLY the 7 required columns:
 * Employee ID, Office, Employee Name, Job Title, Incentives, Transportation, Bonus
 */

import * as XLSX from 'xlsx';
import { EmployeePayoutRecord } from '../types/excelIncentives';

export function exportExtractedDataToExcel(
  records: EmployeePayoutRecord[],
  filename = 'Extracted_Incentives_Payout.xlsx'
): void {
  // Format rows strictly containing only the 7 required columns
  const exportRows = records.map((rec) => ({
    'Employee ID': rec.employeeId,
    'Office': rec.office,
    'Employee Name': rec.employeeName,
    'Job Title': rec.jobTitle,
    'Incentives': rec.incentives !== null ? rec.incentives : '—',
    'Transportation': rec.transportation !== null ? rec.transportation : '—',
    'Bonus': rec.bonus !== null ? rec.bonus : '—',
  }));

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
