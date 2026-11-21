/**
 * Report Export Utility: Excel (CSV with UTF-8 BOM for Arabic) & Clean Print Helper
 */

export function exportToExcel(filename: string, headers: string[], rows: (string | number)[][]): void {
  // Add UTF-8 Byte Order Mark (BOM) so Excel renders Arabic text properly
  const bom = '\uFEFF';
  const csvContent =
    bom +
    [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function triggerPrintWindow(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Cairo', sans-serif;
            margin: 20px;
            color: #0f172a;
            direction: rtl;
            background: #fff;
          }
          .header {
            border-bottom: 2px solid #0d9488;
            padding-bottom: 12px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title {
            font-size: 20px;
            font-weight: bold;
            color: #0d9488;
          }
          .meta {
            font-size: 13px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 15px;
          }
          th {
            background-color: #0d9488;
            color: white;
            padding: 8px 10px;
            text-align: right;
            border: 1px solid #0f766e;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            text-align: right;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .footer {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 11px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
          @media print {
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Driver & Transportation Management System (DTMS)</div>
            <div style="font-weight: 600; margin-top: 4px;">${title}</div>
          </div>
          <div class="meta">
            <div>تاريخ التقرير: ${new Date().toLocaleDateString('ar-EG')}</div>
            <div>نظام إدارة ونقليات المؤسسة</div>
          </div>
        </div>
        ${htmlContent}
        <div class="footer">
          <div>تم استخراج التقرير آلياً عبر نظام DTMS المؤسسي المعتمد</div>
          <div>صفحة 1 من 1</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export const exportToExcelCSV = exportToExcel;

export function printReportTable(title: string, headers: string[], rows: (string | number)[][]) {
  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>${r.map((c) => `<td>${c !== undefined && c !== null ? c : ''}</td>`).join('')}</tr>`
          )
          .join('')}
      </tbody>
    </table>
  `;
  triggerPrintWindow(title, tableHtml);
}
