import ExcelJS from 'exceljs';

export interface FormattedExcelOptions {
  filename: string;
  sheetName?: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
  isRTL?: boolean;
}

/**
 * Helper to trigger file download in browser / Electron
 */
async function saveWorkbookFile(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // Check if File System Access API is supported
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'ملف إكسل Excel Spreadsheet (*.xlsx)',
            accept: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
            }
          }
        ]
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return; // User canceled save dialog
      }
      console.warn('showSaveFilePicker failed or was dismissed, falling back to standard download:', err);
    }
  }

  // Fallback standard browser download
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/**
 * Export a styled Excel sheet matching the exact design:
 * - Header: Dark Navy Blue (#1F2456), Bold White Text, Height 26, Centered, Thin Grid Borders
 * - Data Rows: Calibri 11pt, Height 22, Thin Grid Borders (#D9D9D9)
 * - Auto-filter on header
 * - Auto-adjusted column widths with padding
 * - Grid lines enabled
 */
export async function exportFormattedExcel(options: FormattedExcelOptions): Promise<void> {
  const {
    filename,
    sheetName = 'Sheet1',
    headers,
    rows,
    isRTL = true
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VITAS Iraq HRMS';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true, rightToLeft: isRTL }]
  });

  // 1. Add Header Row
  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2456' } // Exact dark navy blue from attachment
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' } // Pure bold white
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
      right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
    };
  });

  // 2. Add Data Rows
  rows.forEach((rowValues) => {
    const row = worksheet.addRow(rowValues);
    row.height = 22;

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 11,
        color: { argb: 'FF000000' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
        right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
      };

      const val = cell.value !== null && cell.value !== undefined ? String(cell.value) : '';
      const isArabic = /[\u0600-\u06FF]/.test(val);
      const isCenter = colNumber <= 2 || val === 'Active' || val === 'Inactive' || val === '—' || val === '-' || /^\d+$/.test(val);

      cell.alignment = {
        vertical: 'middle',
        horizontal: isCenter ? 'center' : (isArabic ? 'right' : 'left')
      };
    });
  });

  // 3. Auto-fit column widths with padding
  worksheet.columns.forEach((column, index) => {
    let maxLen = (headers[index] || '').length;
    rows.forEach((r) => {
      const val = r[index] !== null && r[index] !== undefined ? String(r[index]) : '';
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    // Set width with padding, minimum 14, max 50
    column.width = Math.min(Math.max(maxLen + 4, 14), 50);
  });

  // 4. Auto-Filter
  if (headers.length > 0) {
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length }
    };
  }

  // 5. Save/Download File
  await saveWorkbookFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Convenience method to export an array of JSON objects with formatted styling
 */
export async function exportFormattedExcelFromJson(
  jsonData: Record<string, any>[],
  filename: string,
  sheetName: string = 'Sheet1',
  isRTL: boolean = true
): Promise<void> {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('No data available to export');
  }

  const headers = Object.keys(jsonData[0]);
  const rows = jsonData.map((item) => headers.map((h) => item[h]));

  await exportFormattedExcel({
    filename,
    sheetName,
    headers,
    rows,
    isRTL
  });
}
