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
  { id: 'dept-head-1', department: 'رئيس قسم الموظف المعني', item: 'مراجعة واعتماد نقل المهام والمسؤوليات وإخلاء الطرف على مستوى القسم' },
  { id: 'credit-1', department: 'قسم الائتمان', subRole: 'المشرف المباشر (لمسؤولي القروض فقط)', item: 'تم استلام المحفظة الائتمانية وجميع مسؤولياتها، ولا توجد أي عهد أو معاملات أو التزامات تشغيلية معلقة' },
  { id: 'credit-2', department: 'قسم الائتمان', subRole: 'مدير القسم أو النائب', item: 'استكمال نقل المحفظة الائتمانية' },
  { id: 'credit-3', department: 'قسم الائتمان', item: 'أمور أخرى:' },
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
    setEmpOrgId(String(emp.employeeId || emp.employee_id || emp.badgeNo || emp.badge_no || ''));
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
      ['القسم', 'الصفة / الفرع', 'المادة', 'منطبق', 'غير منطبق', 'إقرار / توقيع الموظف والتاريخ', 'اسم وتوقيع مسؤول القسم على التنفيذ أو الاستلام والتاريخ', 'الملاحظات'],
      ...rows.map(r => [
        r.department,
        r.subRole || '',
        r.item,
        r.applicable ? '☑' : '☐',
        r.notApplicable ? '☑' : '☐',
        r.employeeSignDate,
        r.deptOfficerSignDate,
        r.notes,
      ]),
      ['', '', '', '', '', '', '', ''],
      [clearanceCompleted ? '☑' : '☐', '', 'تم استكمال إجراءات إخلاء الطرف وبراءة الذمة', '', '', '', '', ''],
      [hasPendingNotes ? '☑' : '☐', '', 'توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي', '', '', '', '', ''],
      ['', '', '', '', '', '', '', ''],
      ['توقيع المشرف المباشر:', supervisorSign, '', '', '', '', 'التاريخ:', supervisorDate || '   /   /   '],
      ['توقيع مدير القسم:', deptManagerSign, '', '', '', '', 'التاريخ:', deptManagerDate || '   /   /   '],
      ['توقيع مسؤول قسم الموارد البشرية:', hrOfficerSign, '', '', '', '', 'التاريخ:', hrOfficerDate || '   /   /   '],
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 48 },
      { wch: 10 },
      { wch: 11 },
      { wch: 24 },
      { wch: 28 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exit_Procedure_Checklist');
    const safeName = empFullName ? `_${empFullName.replace(/\s+/g, '_')}` : '';
    XLSX.writeFile(wb, `Exit_Procedure_Checklist${safeName}.xlsx`);
  };

  const handlePrint = () => {
    const printWin = window.open('', '_blank', 'width=1100,height=900');
    if (!printWin) return;

    // Group rows by department for clean rowSpan in print
    const deptCounts: Record<string, number> = {};
    rows.forEach(r => { deptCounts[r.department] = (deptCounts[r.department] || 0) + 1; });
    const seenDepts = new Set<string>();

    const tableRowsHtml = rows.map(r => {
      let deptCell = '';
      if (!seenDepts.has(r.department)) {
        seenDepts.add(r.department);
        deptCell = `<td rowspan="${deptCounts[r.department]}" style="font-weight:700;background:#f8fafc;vertical-align:middle;text-align:center;">${r.department}</td>`;
      }
      return `
        <tr>
          ${deptCell}
          <td>${r.subRole ? `<div style="font-size:10px;color:#0f766e;font-weight:700;margin-bottom:2px;">${r.subRole}</div>` : ''}${r.item}</td>
          <td style="text-align:center;font-size:14px;">${r.applicable ? '☑' : '☐'}</td>
          <td style="text-align:center;font-size:14px;">${r.notApplicable ? '☑' : '☐'}</td>
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
        <title>استمارة إخلاء الطرف وبراءة الذمة - Exit Procedure Checklist</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #000; font-size: 11px; margin: 0; padding: 0; }
          h1 { text-align: center; font-size: 16px; margin: 0 0 8px 0; padding: 8px; background: #0f766e; color: #fff; border-radius: 6px; }
          .meta-table, .check-table, .sig-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          .meta-table td { border: 1px solid #334155; padding: 5px 8px; }
          .meta-label { font-weight: 700; background: #f1f5f9; width: 18%; }
          .meta-val { width: 32%; }
          .instr { border: 1px solid #0f766e; background: #f0fdfa; padding: 6px 10px; margin-bottom: 8px; font-size: 10.5px; line-height: 1.5; }
          .check-table th { background: #0f766e; color: #fff; border: 1px solid #334155; padding: 5px; font-size: 10.5px; }
          .check-table td { border: 1px solid #475569; padding: 4px 6px; font-size: 10px; line-height: 1.35; }
          .decision { border: 1px solid #334155; padding: 7px 10px; margin-bottom: 10px; font-weight: 700; font-size: 11px; }
          .sig-table td { border: 1px solid #334155; padding: 8px 10px; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>استمارة إخلاء الطرف وبراءة الذمة — Exit Procedure Checklist</h1>
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
        </table>
        <div class="instr">
          <strong>تعليمات خاصة بتوقيع الموظف:</strong>
          يوقّع الموظف في الحقل المخصص، وذلك إما للإقرار بالموافقة على تنفيذ الإجراء ذي العلاقة، أو لتأكيد تسليم العهد أو الموجودات الخاصة بالمؤسسة، بحسب مقتضى الحال.
        </div>
        <table class="check-table">
          <thead>
            <tr>
              <th style="width:16%">القسم</th>
              <th style="width:32%">المادة</th>
              <th style="width:6%">منطبق</th>
              <th style="width:7%">غير منطبق</th>
              <th style="width:13%">إقرار / توقيع الموظف والتاريخ</th>
              <th style="width:15%">اسم وتوقيع مسؤول القسم والتاريخ</th>
              <th style="width:11%">الملاحظات</th>
            </tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
        <div class="decision">
          <div>${clearanceCompleted ? '☑' : '☐'} &nbsp; تم استكمال إجراءات إخلاء الطرف وبراءة الذمة</div>
          <div style="margin-top:4px;">${hasPendingNotes ? '☑' : '☐'} &nbsp; توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي</div>
        </div>
        <table class="sig-table">
          <tr>
            <td style="width:70%">توقيع المشرف المباشر: ${supervisorSign || ''}</td>
            <td style="width:30%">التاريخ: ${supervisorDate || '      /      /      '}</td>
          </tr>
          <tr>
            <td>توقيع مدير القسم: ${deptManagerSign || ''}</td>
            <td>التاريخ: ${deptManagerDate || '      /      /      '}</td>
          </tr>
          <tr>
            <td>توقيع مسؤول قسم الموارد البشرية: ${hrOfficerSign || ''}</td>
            <td>التاريخ: ${hrOfficerDate || '      /      /      '}</td>
          </tr>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  // Precompute department row spans for clean table rendering
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.department] = (counts[r.department] || 0) + 1; });
    return counts;
  }, [rows]);

  const renderedDepts = new Set<string>();

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Action & Employee Auto-Fill Bar */}
      <div className="p-4 rounded-2xl bg-gradient-to-l from-teal-900 to-slate-900 border border-teal-500/30 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-teal-300 text-2xl">assignment_turned_in</span>
          </div>
          <div>
            <h3 className="text-sm font-black text-white">
              {isAr ? 'استمارة إخلاء الطرف وبراءة الذمة (Exit Procedure Checklist)' : 'Exit Procedure Checklist — Clearance Form'}
            </h3>
            <p className="text-[11px] text-teal-200/80">
              {isAr ? 'نموذج رسمي معتمد يشمل 12 قسماً و35 بنداً لإخلاء الطرف وبراءة الذمة — قابل للتعبئة والطباعة والتصدير لإكسل' : 'Official 12-department clearance form — interactive, printable A4, and Excel exportable'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedEmployeeId}
            onChange={(e) => handleSelectEmployee(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-teal-400/40 text-xs text-white focus:outline-none focus:border-teal-300 max-w-[230px]"
          >
            <option value="">{isAr ? '-- اختر موظفاً للتعبئة التلقائية --' : '-- Auto-fill from Employee --'}</option>
            {sortedEmployees.map(emp => (
              <option key={emp.id || emp.employeeId} value={String(emp.id || emp.employeeId)}>
                {emp.fullNameAr || emp.fullName || emp.fullNameEn} ({emp.employeeId || emp.badgeNo || emp.id})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm">print</span>
            <span>{isAr ? 'طباعة / PDF' : 'Print / PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>{isAr ? 'تصدير Excel' : 'Export Excel'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>{isAr ? 'تفريغ' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Employee Header Metadata Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">اسم الموظف الكامل:</label>
            <input type="text" value={empFullName} onChange={e => setEmpFullName(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">العنوان الوظيفي:</label>
            <input type="text" value={empJobTitle} onChange={e => setEmpJobTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">الفرع:</label>
            <input type="text" value={empBranch} onChange={e => setEmpBranch(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ بداية العمل:</label>
            <input type="date" value={empStartDate} onChange={e => setEmpStartDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">تاريخ آخر يوم للعمل:</label>
            <input type="date" value={empLastDay} onChange={e => setEmpLastDay(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
          </div>
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">رقم هوية المؤسسة:</label>
            <input type="text" value={empOrgId} onChange={e => setEmpOrgId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono" />
          </div>
        </div>

        {/* Special Employee Signature Instruction */}
        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-500/30 text-xs text-teal-900 dark:text-teal-200 leading-relaxed">
          <strong className="font-bold">تعليمات خاصة بتوقيع الموظف: </strong>
          يوقّع الموظف في الحقل المخصص، وذلك إما للإقرار بالموافقة على تنفيذ الإجراء ذي العلاقة، أو لتأكيد تسليم العهد أو الموجودات الخاصة بالمؤسسة، بحسب مقتضى الحال.
        </div>
      </div>

      {/* Main 12-Department Exit Checklist Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-sm overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-teal-700 text-white text-[11px]">
              <th className="p-3 border border-teal-600 text-center w-[15%]">القسم</th>
              <th className="p-3 border border-teal-600 text-right w-[30%]">المادة</th>
              <th className="p-3 border border-teal-600 text-center w-[6%]">منطبق</th>
              <th className="p-3 border border-teal-600 text-center w-[7%]">غير منطبق</th>
              <th className="p-3 border border-teal-600 text-center w-[14%]">إقرار / توقيع الموظف والتاريخ</th>
              <th className="p-3 border border-teal-600 text-center w-[15%]">اسم وتوقيع مسؤول القسم والتاريخ</th>
              <th className="p-3 border border-teal-600 text-center w-[13%]">الملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const showDept = !renderedDepts.has(r.department);
              if (showDept) renderedDepts.add(r.department);

              return (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                  {showDept && (
                    <td
                      rowSpan={deptCounts[r.department]}
                      className="p-2.5 border border-slate-200 dark:border-white/10 font-bold text-center align-middle bg-slate-50 dark:bg-slate-900/70 text-slate-900 dark:text-teal-300"
                    >
                      {r.department}
                    </td>
                  )}
                  <td className="p-2.5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                    {r.subRole && (
                      <div className="text-[10px] font-bold text-teal-700 dark:text-teal-400 mb-0.5">{r.subRole}</div>
                    )}
                    <span>{r.item}</span>
                  </td>
                  <td className="p-2 border border-slate-200 dark:border-white/10 text-center">
                    <input
                      type="checkbox"
                      checked={r.applicable}
                      onChange={e => updateRow(r.id, { applicable: e.target.checked, notApplicable: e.target.checked ? false : r.notApplicable })}
                      className="w-4 h-4 accent-teal-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-2 border border-slate-200 dark:border-white/10 text-center">
                    <input
                      type="checkbox"
                      checked={r.notApplicable}
                      onChange={e => updateRow(r.id, { notApplicable: e.target.checked, applicable: e.target.checked ? false : r.applicable })}
                      className="w-4 h-4 accent-amber-600 cursor-pointer"
                    />
                  </td>
                  <td className="p-1.5 border border-slate-200 dark:border-white/10">
                    <input
                      type="text"
                      value={r.employeeSignDate}
                      onChange={e => updateRow(r.id, { employeeSignDate: e.target.value })}
                      placeholder="التوقيع / التاريخ"
                      className="w-full px-2 py-1 rounded-lg bg-transparent border border-slate-200 dark:border-white/10 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="p-1.5 border border-slate-200 dark:border-white/10">
                    <input
                      type="text"
                      value={r.deptOfficerSignDate}
                      onChange={e => updateRow(r.id, { deptOfficerSignDate: e.target.value })}
                      placeholder="الاسم / التوقيع / التاريخ"
                      className="w-full px-2 py-1 rounded-lg bg-transparent border border-slate-200 dark:border-white/10 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="p-1.5 border border-slate-200 dark:border-white/10">
                    <input
                      type="text"
                      value={r.notes}
                      onChange={e => updateRow(r.id, { notes: e.target.value })}
                      placeholder="ملاحظات..."
                      className="w-full px-2 py-1 rounded-lg bg-transparent border border-slate-200 dark:border-white/10 text-[11px] text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Final Clearance Status & Signatures */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 shadow-sm space-y-4 text-xs">
        <div className="space-y-2 pb-3 border-b border-slate-200 dark:border-white/10">
          <label className="flex items-center gap-2.5 font-bold text-emerald-700 dark:text-emerald-400 cursor-pointer">
            <input
              type="checkbox"
              checked={clearanceCompleted}
              onChange={e => {
                setClearanceCompleted(e.target.checked);
                if (e.target.checked) setHasPendingNotes(false);
              }}
              className="w-4 h-4 accent-emerald-600"
            />
            <span>تم استكمال إجراءات إخلاء الطرف وبراءة الذمة</span>
          </label>
          <label className="flex items-center gap-2.5 font-bold text-rose-700 dark:text-rose-400 cursor-pointer">
            <input
              type="checkbox"
              checked={hasPendingNotes}
              onChange={e => {
                setHasPendingNotes(e.target.checked);
                if (e.target.checked) setClearanceCompleted(false);
              }}
              className="w-4 h-4 accent-rose-600"
            />
            <span>توجد ملاحظات / ذمم معلقة تمنع الإغلاق النهائي</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">توقيع المشرف المباشر:</label>
            <input type="text" value={supervisorSign} onChange={e => setSupervisorSign(e.target.value)} placeholder="الاسم والتوقيع" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
            <input type="date" value={supervisorDate} onChange={e => setSupervisorDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">توقيع مدير القسم:</label>
            <input type="text" value={deptManagerSign} onChange={e => setDeptManagerSign(e.target.value)} placeholder="الاسم والتوقيع" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
            <input type="date" value={deptManagerDate} onChange={e => setDeptManagerDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono" />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 space-y-2">
            <label className="block font-bold text-slate-800 dark:text-slate-200">توقيع مسؤول قسم الموارد البشرية:</label>
            <input type="text" value={hrOfficerSign} onChange={e => setHrOfficerSign(e.target.value)} placeholder="الاسم والتوقيع" className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white" />
            <input type="date" value={hrOfficerDate} onChange={e => setHrOfficerDate(e.target.value)} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-mono" />
          </div>
        </div>
      </div>
    </div>
  );
};
