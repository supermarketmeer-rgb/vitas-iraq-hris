import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

interface ExitChecklistItem {
  id: string;
  department: string;
  subRole?: string;
  item: string;
  applicable: boolean;
  notApplicable: boolean;
  employeeSignDate: string;
  deptOfficerSignDate: string;
  notes: string;
}

interface ExitProcedureChecklistTemplateProps {
  employees?: any[];
  language?: string;
}

const INITIAL_CHECKLIST_ITEMS: Omit<ExitChecklistItem, 'applicable' | 'notApplicable' | 'employeeSignDate' | 'deptOfficerSignDate' | 'notes'>[] = [
  { id: 'sup-1', department: 'المشرف المباشر', item: 'تم استلام جميع المهام والمسؤوليات، ونقلها إلى الموظف أو الجهة المختصة، ولا توجد أعمال أو التزامات تشغيلية معلقة بعهدته' },
  { id: 'dept-head-1', department: 'رئيس قسم الموظف المعني', item: 'اعتماد استلام جميع المهام والمسؤوليات ونقلها وعدم وجود التزامات تشغيلية معلقة' },
  { id: 'credit-1', department: 'قسم الائتمان', subRole: 'المشرف المباشر (لمسؤولي القروض فقط)', item: 'تم استلام المحفظة الائتمانية وجميع مسؤولياتها، ولا توجد أي عهد أو معاملات أو التزامات تشغيلية معلقة' },
  { id: 'credit-2', department: 'قسم الائتمان', subRole: 'مدير القسم أو النائب', item: 'استكمال نقل المحفظة الائتمانية' },
  { id: 'credit-3', department: 'قسم الائتمان', subRole: '', item: 'أمور أخرى:' },
  { id: 'audit-1', department: 'قسم التدقيق الداخلي', item: 'عدم وجود ملاحظات تدقيقية مفتوحة تتطلب متابعة من الموظف' },
  { id: 'hr-1', department: 'قسم الموارد البشرية', item: 'توقيع آخر عقد عمل مع الملحقات' },
  { id: 'hr-2', department: 'قسم الموارد البشرية', item: 'توقيع جميع استمارات الدوام' },
  { id: 'hr-3', department: 'قسم الموارد البشرية', item: 'تسوية الالتزامات المتعلقة بالقرض وفق الإجراءات المعتمدة' },
  { id: 'hr-4', department: 'قسم الموارد البشرية', item: 'إنهاء التسجيل لدى الضمان الاجتماعي' },
  { id: 'hr-5', department: 'قسم الموارد البشرية', item: 'إلغاء التغطية التأمينية' },
  { id: 'hr-6', department: 'قسم الموارد البشرية', item: 'غلق حساب نظام الموارد البشرية' },
  { id: 'hr-7', department: 'قسم الموارد البشرية', item: 'تسليم هويات المؤسسة' },
  { id: 'hr-8', department: 'قسم الموارد البشرية', item: 'أمور أخرى:' },
  { id: 'acc-1', department: 'قسم الحسابات', item: 'تصفية السلف' },
  { id: 'acc-2', department: 'قسم الحسابات', item: 'تصفية فواتير الشراء عن طريق الفرع' },
  { id: 'acc-3', department: 'قسم الحسابات', item: 'عدم وجود ذمم مالية أو التزامات مالية معلقة' },
  { id: 'legal-1', department: 'قسم الشؤون القانونية والأمور التنظيمية', item: 'عدم وجود التزامات قانونية معلقة' },
  { id: 'treasury-1', department: 'قسم الخزينة', item: 'تسليم الصكوك' },
  { id: 'treasury-2', department: 'قسم الخزينة', item: 'تسليم دفتر الوصولات' },
  { id: 'treasury-3', department: 'قسم الخزينة', item: 'تسليم الأختام إن وجدت' },
  { id: 'treasury-4', department: 'قسم الخزينة', item: 'إلغاء التخاويل الإدارية' },
  { id: 'treasury-5', department: 'قسم الخزينة', item: 'إلغاء التحويل المصرفي وإلغاء العلاقة بالحساب المصرفي' },
  { id: 'treasury-6', department: 'قسم الخزينة', item: 'أمور أخرى:' },
  { id: 'sec-1', department: 'قسم الأمن', item: 'تسليم المفاتيح والأمور المتعلقة بالأمن' },
  { id: 'sec-2', department: 'قسم الأمن', item: 'أمور أخرى:' },
  { id: 'proc-1', department: 'المشتريات', item: 'تسليم جميع الأصول المسجلة بعهدة الموظف' },
  { id: 'proc-2', department: 'المشتريات', item: 'تسليم مفاتيح القاصة' },
  { id: 'proc-3', department: 'المشتريات', item: 'تسليم شريحة اتصال زين وشريحة الداتا' },
  { id: 'proc-4', department: 'المشتريات', item: 'إغلاق حساب نظام الجرد' },
  { id: 'proc-5', department: 'المشتريات', item: 'أمور أخرى:' },
  { id: 'it-1', department: 'قسم تكنولوجيا المعلومات ونظام إدارة المعلومات', item: 'إغلاق الحساب على جميع الأنظمة المعتمدة بالمؤسسة (Web.Abacus، TMX، البريد الإلكتروني، نظام الأرشفة، وغيره)' },
  { id: 'it-2', department: 'قسم تكنولوجيا المعلومات ونظام إدارة المعلومات', item: 'رفع الموظف من جهاز الحضور والانصراف' },
  { id: 'it-3', department: 'قسم تكنولوجيا المعلومات ونظام إدارة المعلومات', item: 'أمور أخرى:' },
  { id: 'comp-1', department: 'قسم الامتثال', item: 'إلغاء الحساب على أنظمة الامتثال' },
];

const createBlankRows = (): ExitChecklistItem[] =>
  INITIAL_CHECKLIST_ITEMS.map(row => ({
    ...row,
    applicable: false,
    notApplicable: false,
    employeeSignDate: '',
    deptOfficerSignDate: '',
    notes: '',
  }));

export const ExitProcedureChecklistTemplate: React.FC<ExitProcedureChecklistTemplateProps> = ({
  employees = [],
  language = 'ar',
}) => {
  const isAr = language === 'ar';

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [empFullName, setEmpFullName] = useState('');
  const [empJobTitle, setEmpJobTitle] = useState('');
  const [empStartDate, setEmpStartDate] = useState('');
  const [empLastDay, setEmpLastDay] = useState('');
  const [empBranch, setEmpBranch] = useState('');
  const [empOrgId, setEmpOrgId] = useState('');

  const [rows, setRows] = useState<ExitChecklistItem[]>(createBlankRows);
  const [clearanceCompleted, setClearanceCompleted] = useState(false);
  const [hasPendingNotes, setHasPendingNotes] = useState(false);

  const [supervisorSign, setSupervisorSign] = useState('');
  const [supervisorDate, setSupervisorDate] = useState('');
  const [deptManagerSign, setDeptManagerSign] = useState('');
  const [deptManagerDate, setDeptManagerDate] = useState('');
  const [hrOfficerSign, setHrOfficerSign] = useState('');
  const [hrOfficerDate, setHrOfficerDate] = useState('');

  const sortedEmployees = useMemo(() => {
    return [...(employees || [])].sort((a, b) =>
      String(a.fullNameAr || a.fullName || a.fullNameEn || '').localeCompare(
        String(b.fullNameAr || b.fullName || b.fullNameEn || '')
      )
    );
  }, [employees]);

  // Compute department spans & group boundaries so department names never repeat
  const deptMeta = useMemo(() => {
    const counts: Record<string, number> = {};
    const firstIndex: Record<string, number> = {};
    rows.forEach((r, idx) => {
      counts[r.department] = (counts[r.department] || 0) + 1;
      if (firstIndex[r.department] === undefined) firstIndex[r.department] = idx;
    });
    return { counts, firstIndex };
  }, [rows]);

  const handleSelectEmployee = (empId: string) => {
    setSelectedEmployeeId(empId);
    if (!empId) return;
    const emp = employees.find(e => String(e.id || e.employeeId) === empId);
    if (!emp) return;
    setEmpFullName(emp.fullNameAr || emp.full_name_ar || emp.fullName || emp.fullNameEn || '');
    setEmpJobTitle(emp.jobTitle || emp.position_ar || emp.position_en || emp.position || '');
    setEmpStartDate(String(emp.originalStartDate || emp.original_start_date || emp.contractStartDate || emp.contract_start_date || '').slice(0, 10));
    setEmpLastDay(String(emp.exitDate || emp.exit_date || '').slice(0, 10));
    setEmpBranch(emp.branch || emp.location_ar || emp.location_en || '');
    setEmpOrgId(String(emp.badgeNo || emp.badge_no || emp.employeeId || emp.employee_id || ''));
  };

  const updateRow = (id: string, patch: Partial<ExitChecklistItem>) => {
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleReset = () => {
    setSelectedEmployeeId('');
    setEmpFullName('');
    setEmpJobTitle('');
    setEmpStartDate('');
    setEmpLastDay('');
    setEmpBranch('');
    setEmpOrgId('');
    setRows(createBlankRows());
    setClearanceCompleted(false);
    setHasPendingNotes(false);
    setSupervisorSign('');
    setSupervisorDate('');
    setDeptManagerSign('');
    setDeptManagerDate('');
    setHrOfficerSign('');
    setHrOfficerDate('');
  };

  const handleExportExcel = () => {
    const aoa: any[][] = [
      ['استمارة إخلاء الطرف وبراءة الذمة', '', '', '', '', '', '', ''],
      ['اسم الموظف الكامل:', empFullName, '', '', 'العنوان الوظيفي:', empJobTitle, '', ''],
      ['تاريخ بداية العمل:', empStartDate, '', '', 'تاريخ آخر يوم للعمل:', empLastDay, '', ''],
      ['الفرع:', empBranch, '', '', 'رقم هوية المؤسسة:', empOrgId, '', ''],
      [
        'تعليمات خاصة بتوقيع الموظف:',
        'يوقّع الموظف في الحقل المخصص، وذلك إما للإقرار بالموافقة على تنفيذ الإجراء ذي العلاقة، أو لتأكيد تسليم العهد أو الموجودات الخاصة بالمؤسسة، بحسب مقتضى الحال.',
        '', '', '', '', '', ''
      ],
      ['القسم', '', 'المادة', 'منطبق', 'غير منطبق', 'إقرار / توقيع الموظف والتاريخ', 'اسم وتوقيع مسؤول القسم على التنفيذ أو الاستلام والتاريخ', 'الملاحظات'],
    ];

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Title
      { s: { r: 4, c: 1 }, e: { r: 4, c: 7 } }, // Instructions
      { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } }, // Header: القسم spans col 0-1
    ];

    const startRowIndex = 6;
    const seen = new Set<string>();
    rows.forEach((r, idx) => {
      const excelRow = startRowIndex + idx;
      const isFirst = !seen.has(r.department);
      if (isFirst) {
        seen.add(r.department);
        const span = deptMeta.counts[r.department];
        const hasSubCol = r.department === 'قسم الائتمان';
        if (hasSubCol) {
          if (span > 1) merges.push({ s: { r: excelRow, c: 0 }, e: { r: excelRow + span - 1, c: 0 } });
        } else {
          merges.push({ s: { r: excelRow, c: 0 }, e: { r: excelRow + span - 1, c: 1 } });
        }
      }
      aoa.push([
        isFirst ? r.department : '',
        r.department === 'قسم الائتمان' ? (r.subRole || '') : '',
        r.item,
        r.applicable ? '☑' : '☐',
        r.notApplicable ? '☑' : '☐',
        r.employeeSignDate,
        r.deptOfficerSignDate,
        r.notes,
      ]);
    });

    aoa.push(['', '', '', '', '', '', '', '']);
    aoa.push([clearanceCompleted ? '☑' : '☐', '', 'تم استكمال إجراءات إخلاء الطرف وبراءة الذمة', '', '', '', '', '']);
    aoa.push([hasPendingNotes ? '☑' : '☐', '', 'توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي', '', '', '', '', '']);
    aoa.push(['', '', '', '', '', '', '', '']);
    aoa.push(['توقيع المشرف المباشر:', supervisorSign, '', '', '', '', 'التاريخ:', supervisorDate || '   /   /   ']);
    aoa.push(['توقيع مدير القسم:', deptManagerSign, '', '', '', '', 'التاريخ:', deptManagerDate || '   /   /   ']);
    aoa.push(['توقيع مسؤول قسم الموارد البشرية:', hrOfficerSign, '', '', '', '', 'التاريخ:', hrOfficerDate || '   /   /   ']);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 24 },
      { wch: 22 },
      { wch: 46 },
      { wch: 9 },
      { wch: 10 },
      { wch: 22 },
      { wch: 26 },
      { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    if (!wb.Workbook) wb.Workbook = {};
    wb.Workbook.Views = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, 'Exit_Procedure_Checklist');
    const safeName = empFullName ? `_${empFullName.replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(wb, `Exit_Procedure_Checklist${safeName}.xlsx`);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=1000,height=900');
    if (!printWin) return;

    const seenDepts = new Set<string>();
    const tableRowsHtml = rows.map((r, idx) => {
      const isFirst = !seenDepts.has(r.department);
      if (isFirst) seenDepts.add(r.department);
      const span = deptMeta.counts[r.department];
      const isCredit = r.department === 'قسم الائتمان';
      const topBorderClass = isFirst && idx > 0 ? 'dept-sep' : '';

      let deptCells = '';
      if (isCredit) {
        if (isFirst) {
          deptCells += `<td rowspan="${span}" class="dept-cell">${r.department}</td>`;
        }
        deptCells += `<td class="sub-cell">${r.subRole || ''}</td>`;
      } else if (isFirst) {
        deptCells += `<td rowspan="${span}" colspan="2" class="dept-cell">${r.department}</td>`;
      }

      return `
        <tr class="${topBorderClass}">
          ${deptCells}
          <td class="item-cell">${r.item}</td>
          <td class="chk-cell">${r.applicable ? '☑' : '☐'}</td>
          <td class="chk-cell">${r.notApplicable ? '☑' : '☐'}</td>
          <td>${r.employeeSignDate || ''}</td>
          <td>${r.deptOfficerSignDate || ''}</td>
          <td>${r.notes || ''}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>استمارة إخلاء الطرف وبراءة الذمة</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #111827; font-size: 9.5px; margin: 0; padding: 0; background: #fff; }
          .doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 4px; margin-bottom: 5px; }
          .brand-right { font-weight: 900; font-size: 13px; color: #0f766e; letter-spacing: 1px; }
          .brand-left { font-weight: 700; font-size: 10px; color: #0369a1; text-align: left; }
          .doc-title { font-size: 14px; font-weight: 900; text-align: center; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          .meta-table { margin-bottom: 4px; border: 1.5px solid #374151; }
          .meta-table td { border: 1px solid #9ca3af; padding: 2.5px 5px; font-size: 9.5px; }
          .meta-label { font-weight: 700; width: 17%; background: #f9fafb; }
          .meta-val { width: 33%; }
          .instr-row td { background: #f9fafb; font-size: 9px; line-height: 1.3; }
          .check-table { border: 1.5px solid #374151; margin-bottom: 4px; }
          .check-table th { background: #e5e7eb; color: #000; border: 1px solid #9ca3af; padding: 3px 4px; font-size: 9px; font-weight: 800; text-align: center; }
          .check-table td { border: 1px solid #9ca3af; padding: 2px 4px; font-size: 8.8px; line-height: 1.22; vertical-align: middle; }
          .dept-sep td { border-top: 1.5px solid #4b5563 !important; }
          .dept-cell { font-weight: 800; text-align: center; background: #f9fafb; color: #000; }
          .sub-cell { font-weight: 700; text-align: center; font-size: 8px; color: #1f2937; background: #fcfcfd; }
          .item-cell { text-align: right; color: #111827; }
          .chk-cell { text-align: center; font-size: 11px; }
          .decision { padding: 3px 6px; margin-bottom: 4px; font-weight: 700; font-size: 9.5px; display: flex; justify-content: space-between; gap: 12px; }
          .sig-table { border: 1.5px solid #374151; }
          .sig-table td { border: 1px solid #9ca3af; padding: 5px 7px; font-weight: 700; font-size: 9.2px; width: 33.33%; vertical-align: top; }
          .sig-date { margin-top: 6px; font-weight: 600; color: #374151; }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <img src="${window.location.origin}/logos/exit_checklist_image1.jpeg" alt="VITAS Iraq" style="height:36px;object-fit:contain;" />
          <div class="doc-title">استمارة إخلاء الطرف وبراءة الذمة</div>
          <img src="${window.location.origin}/logos/exit_checklist_image2.jpeg" alt="Global Communities Iraq" style="height:36px;object-fit:contain;" />
        </div>
        <table class="meta-table">
          <tr>
            <td class="meta-label">اسم الموظف الكامل:</td><td class="meta-val">${empFullName || ''}</td>
            <td class="meta-label">العنوان الوظيفي:</td><td class="meta-val">${empJobTitle || ''}</td>
          </tr>
          <tr>
            <td class="meta-label">تاريخ بداية العمل:</td><td class="meta-val">${empStartDate || ''}</td>
            <td class="meta-label">تاريخ آخر يوم للعمل:</td><td class="meta-val">${empLastDay || ''}</td>
          </tr>
          <tr>
            <td class="meta-label">الفرع:</td><td class="meta-val">${empBranch || ''}</td>
            <td class="meta-label">رقم هوية المؤسسة:</td><td class="meta-val">${empOrgId || ''}</td>
          </tr>
          <tr class="instr-row">
            <td class="meta-label">تعليمات خاصة بتوقيع الموظف:</td>
            <td colspan="3">يوقّع الموظف في الحقل المخصص، وذلك إما للإقرار بالموافقة على تنفيذ الإجراء ذي العلاقة، أو لتأكيد تسليم العهد أو الموجودات الخاصة بالمؤسسة، بحسب مقتضى الحال.</td>
          </tr>
        </table>
        <table class="check-table">
          <thead>
            <tr>
              <th colspan="2" style="width:19%">القسم</th>
              <th style="width:31%">المادة</th>
              <th style="width:5.5%">منطبق</th>
              <th style="width:6.5%">غير منطبق</th>
              <th style="width:13%">إقرار / توقيع الموظف والتاريخ</th>
              <th style="width:14%">اسم وتوقيع مسؤول القسم على التنفيذ أو الاستلام والتاريخ</th>
              <th style="width:11%">الملاحظات</th>
            </tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <div class="decision">
          <div>${clearanceCompleted ? '☑' : '☐'} &nbsp; تم استكمال إجراءات إخلاء الطرف وبراءة الذمة</div>
          <div>${hasPendingNotes ? '☑' : '☐'} &nbsp; توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي</div>
        </div>
        <table class="sig-table">
          <tr>
            <td>
              <div>توقيع المشرف المباشر: ${supervisorSign || ''}</div>
              <div class="sig-date">التاريخ: ${supervisorDate || '    /    /    '}</div>
            </td>
            <td>
              <div>توقيع مدير القسم: ${deptManagerSign || ''}</div>
              <div class="sig-date">التاريخ: ${deptManagerDate || '    /    /    '}</div>
            </td>
            <td>
              <div>توقيع مسؤول قسم الموارد البشرية: ${hrOfficerSign || ''}</div>
              <div class="sig-date">التاريخ: ${hrOfficerDate || '    /    /    '}</div>
            </td>
          </tr>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const renderedDepts = new Set<string>();

  return (
    <div className="space-y-4" dir="rtl">
      {/* Compact Action & Employee Auto-Fill Toolbar */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-teal-400 text-xl">assignment_turned_in</span>
          <span className="text-xs font-bold">
            {isAr ? 'نموذج استمارة إخلاء الطرف وبراءة الذمة (مطابق للملف الأصلي)' : 'Exit Procedure Checklist (Official Original Layout)'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleSelectEmployee(e.target.value)}
            style={{ backgroundColor: '#ffffff', color: '#0f172a', borderColor: '#0d9488' }}
            className="px-3 py-1.5 rounded-xl border-2 text-xs font-bold !bg-white !text-slate-900 focus:outline-none focus:border-teal-600 max-w-[240px] cursor-pointer shadow-xs"
          >
            <option value="" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>{isAr ? '-- تعبئة تلقائية من موظف --' : '-- Auto-fill from Employee --'}</option>
            {sortedEmployees.map(emp => (
              <option key={emp.id || emp.employeeId} value={String(emp.id || emp.employeeId)} style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
                {emp.fullNameAr || emp.fullName || emp.fullNameEn} ({emp.badgeNo || emp.badge_no || emp.employeeId || emp.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handlePrint}
            style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
            className="px-3.5 py-1.5 rounded-xl hover:opacity-90 !text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm !text-white" style={{ color: '#ffffff' }}>print</span>
            <span className="!text-white" style={{ color: '#ffffff' }}>{isAr ? 'طباعة / PDF' : 'Print / PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            style={{ backgroundColor: '#059669', color: '#ffffff' }}
            className="px-3.5 py-1.5 rounded-xl hover:opacity-90 !text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm !text-white" style={{ color: '#ffffff' }}>download</span>
            <span className="!text-white" style={{ color: '#ffffff' }}>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            style={{ backgroundColor: '#334155', color: '#ffffff' }}
            className="px-3 py-1.5 rounded-xl hover:opacity-90 !text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm !text-white" style={{ color: '#ffffff' }}>restart_alt</span>
            <span className="!text-white" style={{ color: '#ffffff' }}>{isAr ? 'تفريغ' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Official A4 Paper Form Container (Matches Original Excel Layout) */}
      <div className="bg-white text-gray-900 rounded-xl border border-gray-400 shadow-lg p-5 md:p-7 overflow-x-auto">
        <div className="min-w-[860px]">
          {/* Official Top Logos & Title Bar */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-gray-800">
            <img
              src="/logos/exit_checklist_image1.jpeg"
              alt="VITAS Iraq"
              className="h-11 object-contain"
            />

            <h2 className="text-lg font-black text-black text-center">
              استمارة إخلاء الطرف وبراءة الذمة
            </h2>

            <img
              src="/logos/exit_checklist_image2.jpeg"
              alt="Global Communities Iraq"
              className="h-11 object-contain"
            />
          </div>

          {/* Employee Metadata Grid (Exact Original Rows 2-5) */}
          <table className="w-full border-collapse border border-gray-500 text-xs mb-2">
            <tbody>
              <tr>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 w-[17%] text-gray-900">اسم الموظف الكامل:</td>
                <td className="border border-gray-400 px-2 py-1 w-[33%]">
                  <input type="text" value={empFullName} onChange={e => setEmpFullName(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 focus:outline-none focus:bg-teal-50/40 px-1 py-0.5 rounded" />
                </td>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 w-[17%] text-gray-900">العنوان الوظيفي:</td>
                <td className="border border-gray-400 px-2 py-1 w-[33%]">
                  <input type="text" value={empJobTitle} onChange={e => setEmpJobTitle(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 focus:outline-none focus:bg-teal-50/40 px-1 py-0.5 rounded" />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 text-gray-900">تاريخ بداية العمل:</td>
                <td className="border border-gray-400 px-2 py-1">
                  <input type="date" value={empStartDate} onChange={e => setEmpStartDate(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 font-mono focus:outline-none px-1 py-0.5" />
                </td>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 text-gray-900">تاريخ آخر يوم للعمل:</td>
                <td className="border border-gray-400 px-2 py-1">
                  <input type="date" value={empLastDay} onChange={e => setEmpLastDay(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 font-mono focus:outline-none px-1 py-0.5" />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 text-gray-900">الفرع:</td>
                <td className="border border-gray-400 px-2 py-1">
                  <input type="text" value={empBranch} onChange={e => setEmpBranch(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 focus:outline-none focus:bg-teal-50/40 px-1 py-0.5 rounded" />
                </td>
                <td className="border border-gray-400 bg-gray-50 font-bold px-2.5 py-1.5 text-gray-900">رقم هوية المؤسسة:</td>
                <td className="border border-gray-400 px-2 py-1">
                  <input type="text" value={empOrgId} onChange={e => setEmpOrgId(e.target.value)} className="w-full bg-transparent text-xs text-gray-900 font-mono focus:outline-none focus:bg-teal-50/40 px-1 py-0.5 rounded" />
                </td>
              </tr>
              <tr className="bg-gray-50/80">
                <td className="border border-gray-400 font-bold px-2.5 py-2 text-gray-900">تعليمات خاصة بتوقيع الموظف:</td>
                <td colSpan={3} className="border border-gray-400 px-3 py-2 text-[11px] text-gray-800 leading-relaxed">
                  يوقّع الموظف في الحقل المخصص، وذلك إما للإقرار بالموافقة على تنفيذ الإجراء ذي العلاقة، أو لتأكيد تسليم العهد أو الموجودات الخاصة بالمؤسسة، بحسب مقتضى الحال.
                </td>
              </tr>
            </tbody>
          </table>

          {/* Main Checklist Table (Gray Grid Lines, Non-Repeating Merged Department Cells) */}
          <table className="w-full border-collapse border border-gray-500 text-[11px]">
            <thead>
              <tr className="bg-gray-200 text-black font-extrabold">
                <th colSpan={2} className="border border-gray-400 px-2 py-2 text-center w-[19%]">القسم</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-[30%]">المادة</th>
                <th className="border border-gray-400 px-1.5 py-2 text-center w-[5.5%]">منطبق</th>
                <th className="border border-gray-400 px-1.5 py-2 text-center w-[6.5%]">غير منطبق</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-[13%]">إقرار / توقيع الموظف والتاريخ</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-[15%]">اسم وتوقيع مسؤول القسم على التنفيذ أو الاستلام والتاريخ</th>
                <th className="border border-gray-400 px-2 py-2 text-center w-[11%]">الملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isFirstOfDept = !renderedDepts.has(r.department);
                if (isFirstOfDept) renderedDepts.add(r.department);
                const span = deptMeta.counts[r.department];
                const isCredit = r.department === 'قسم الائتمان';
                const topDeptBorder = isFirstOfDept && idx > 0 ? 'border-t-2 border-t-gray-500' : '';

                return (
                  <tr key={r.id} className={`hover:bg-gray-50/70 ${topDeptBorder}`}>
                    {isCredit ? (
                      <>
                        {isFirstOfDept && (
                          <td
                            rowSpan={span}
                            className="border border-gray-400 bg-gray-50 px-2 py-1.5 font-extrabold text-center align-middle text-gray-900 w-[9%]"
                          >
                            {r.department}
                          </td>
                        )}
                        <td className="border border-gray-400 bg-gray-50/50 px-1.5 py-1.5 font-bold text-center align-middle text-[10px] text-gray-800 w-[10%]">
                          {r.subRole || ''}
                        </td>
                      </>
                    ) : (
                      isFirstOfDept && (
                        <td
                          rowSpan={span}
                          colSpan={2}
                          className="border border-gray-400 bg-gray-50 px-2 py-1.5 font-extrabold text-center align-middle text-gray-900"
                        >
                          {r.department}
                        </td>
                      )
                    )}

                    <td className="border border-gray-400 px-2.5 py-1.5 text-right text-gray-900 leading-snug">
                      {r.item}
                    </td>

                    <td className="border border-gray-400 px-1 py-1 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={r.applicable}
                        onChange={e => updateRow(r.id, { applicable: e.target.checked, notApplicable: e.target.checked ? false : r.notApplicable })}
                        className="w-3.5 h-3.5 accent-teal-700 cursor-pointer"
                      />
                    </td>

                    <td className="border border-gray-400 px-1 py-1 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={r.notApplicable}
                        onChange={e => updateRow(r.id, { notApplicable: e.target.checked, applicable: e.target.checked ? false : r.applicable })}
                        className="w-3.5 h-3.5 accent-gray-700 cursor-pointer"
                      />
                    </td>

                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={r.employeeSignDate}
                        onChange={e => updateRow(r.id, { employeeSignDate: e.target.value })}
                        className="w-full bg-transparent text-[10.5px] text-gray-900 px-1 py-0.5 focus:outline-none focus:bg-teal-50/50 rounded"
                      />
                    </td>

                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={r.deptOfficerSignDate}
                        onChange={e => updateRow(r.id, { deptOfficerSignDate: e.target.value })}
                        className="w-full bg-transparent text-[10.5px] text-gray-900 px-1 py-0.5 focus:outline-none focus:bg-teal-50/50 rounded"
                      />
                    </td>

                    <td className="border border-gray-400 px-1 py-1">
                      <input
                        type="text"
                        value={r.notes}
                        onChange={e => updateRow(r.id, { notes: e.target.value })}
                        className="w-full bg-transparent text-[10.5px] text-gray-900 px-1 py-0.5 focus:outline-none focus:bg-teal-50/50 rounded"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Final Clearance Decision Checkboxes (Exact Original Rows 43-44) */}
          <div className="my-3 px-2 space-y-1.5 text-xs font-bold text-gray-900">
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={clearanceCompleted}
                onChange={e => {
                  setClearanceCompleted(e.target.checked);
                  if (e.target.checked) setHasPendingNotes(false);
                }}
                className="w-4 h-4 accent-teal-700"
              />
              <span>تم استكمال إجراءات إخلاء الطرف وبراءة الذمة</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={hasPendingNotes}
                onChange={e => {
                  setHasPendingNotes(e.target.checked);
                  if (e.target.checked) setClearanceCompleted(false);
                }}
                className="w-4 h-4 accent-rose-700"
              />
              <span>توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي</span>
            </label>
          </div>

          {/* Final 3 Signatures Arranged in a Single Horizontal Row */}
          <table className="w-full border-collapse border border-gray-500 text-xs font-bold text-gray-900">
            <tbody>
              <tr>
                <td className="border border-gray-400 px-3 py-2.5 w-1/3 align-top">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap">توقيع المشرف المباشر:</span>
                      <input type="text" value={supervisorSign} onChange={e => setSupervisorSign(e.target.value)} className="w-full bg-transparent font-normal focus:outline-none focus:bg-teal-50/40 px-1 rounded border-b border-gray-300" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap text-[11px] text-gray-700">التاريخ:</span>
                      <input type="date" value={supervisorDate} onChange={e => setSupervisorDate(e.target.value)} className="w-full bg-transparent font-mono font-normal text-[11px] focus:outline-none" />
                    </div>
                  </div>
                </td>
                <td className="border border-gray-400 px-3 py-2.5 w-1/3 align-top">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap">توقيع مدير القسم:</span>
                      <input type="text" value={deptManagerSign} onChange={e => setDeptManagerSign(e.target.value)} className="w-full bg-transparent font-normal focus:outline-none focus:bg-teal-50/40 px-1 rounded border-b border-gray-300" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap text-[11px] text-gray-700">التاريخ:</span>
                      <input type="date" value={deptManagerDate} onChange={e => setDeptManagerDate(e.target.value)} className="w-full bg-transparent font-mono font-normal text-[11px] focus:outline-none" />
                    </div>
                  </div>
                </td>
                <td className="border border-gray-400 px-3 py-2.5 w-1/3 align-top">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap">توقيع مسؤول الموارد البشرية:</span>
                      <input type="text" value={hrOfficerSign} onChange={e => setHrOfficerSign(e.target.value)} className="w-full bg-transparent font-normal focus:outline-none focus:bg-teal-50/40 px-1 rounded border-b border-gray-300" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="whitespace-nowrap text-[11px] text-gray-700">التاريخ:</span>
                      <input type="date" value={hrOfficerDate} onChange={e => setHrOfficerDate(e.target.value)} className="w-full bg-transparent font-mono font-normal text-[11px] focus:outline-none" />
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
