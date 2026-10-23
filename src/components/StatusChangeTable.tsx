import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { exportFormattedExcelFromJson } from '../utils/excelFormatHelper';
import {
  StatusChangeRecord,
  getStatusChangesList,
  getEmployeeStatusChanges,
  saveStatusChangeRecord,
  deleteStatusChangeRecord
} from '../utils/statusTrainingWarningHelper';

interface StatusChangeTableProps {
  employee?: any;
  employees?: any[];
  language?: string;
  theme?: string;
  isCompact?: boolean;
}

export const StatusChangeTable: React.FC<StatusChangeTableProps> = ({
  employee,
  employees = [],
  language = 'ar',
  theme = 'light',
  isCompact = false
}) => {
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [records, setRecords] = useState<StatusChangeRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<StatusChangeRecord | null>(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formPosition, setFormPosition] = useState('');
  const [formSalary, setFormSalary] = useState<number | string>('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load records
  const loadData = () => {
    if (employee) {
      setRecords(getEmployeeStatusChanges(employee));
    } else {
      setRecords(getStatusChangesList());
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('vitas_status_changes_updated', handleUpdate);
    return () => window.removeEventListener('vitas_status_changes_updated', handleUpdate);
  }, [employee]);

  // Open modal for add
  const handleOpenAdd = () => {
    setEditingRecord(null);
    if (employee) {
      const empCode = employee.employeeId || employee.badgeNo || employee.badge_no || `VIT-${String(employee.id || 1).padStart(4, '0')}`;
      const empName = employee.fullName || employee.fullNameEn || 'الموظف';
      setFormEmployeeId(empCode);
      setFormEmployeeName(empName);
      setFormPosition(employee.jobTitle || '');
      setFormSalary(employee.basicSalary || employee.salary || '');
      setFormStartDate(new Date().toISOString().slice(0, 10));
      setFormEndDate(isAr ? 'الحالي / Present' : 'Present');
    } else {
      setFormEmployeeId(employees[0]?.employeeId || employees[0]?.badgeNo || 'VIT-0001');
      setFormEmployeeName(employees[0]?.fullName || employees[0]?.fullNameEn || '');
      setFormPosition('');
      setFormSalary('');
      setFormStartDate(new Date().toISOString().slice(0, 10));
      setFormEndDate('');
    }
    setFormNotes('');
    setShowModal(true);
  };

  // Open modal for edit
  const handleOpenEdit = (rec: StatusChangeRecord) => {
    setEditingRecord(rec);
    setFormEmployeeId(rec.employee_id);
    setFormEmployeeName(rec.employee_name);
    setFormStartDate(rec.start_date);
    setFormPosition(rec.position);
    setFormSalary(rec.basic_salary);
    setFormEndDate(rec.end_date);
    setFormNotes(rec.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStartDate || !formPosition) {
      alert(isAr ? 'يرجى إدخال تاريخ البدء والمسمى الوظيفي' : 'Please provide start date and position');
      return;
    }

    const rec: StatusChangeRecord = {
      id: editingRecord ? editingRecord.id : `sc-${Date.now()}`,
      employee_id: formEmployeeId.trim(),
      employee_name: formEmployeeName.trim() || 'موظف',
      start_date: formStartDate,
      position: formPosition.trim(),
      basic_salary: Number(formSalary) || 0,
      end_date: formEndDate.trim() || (isAr ? 'الحالي / Present' : 'Present'),
      notes: formNotes.trim(),
      created_at: editingRecord?.created_at || new Date().toISOString()
    };

    saveStatusChangeRecord(rec);
    setShowModal(false);
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا السجل من تغيير الحالة؟' : 'Are you sure you want to delete this status change record?')) {
      deleteStatusChangeRecord(id);
    }
  };

  // Excel Template
  const handleGenerateTemplate = async () => {
    const wsData = [
      {
        'Employee ID': 'VIT-0037',
        'Employee Name': 'Mustafa Ali Meer',
        'Start Date': '2023-04-26',
        'Position': 'Senior Credit Officer',
        'Basic Salary': 1100000,
        'End Date': '2024-12-31'
      },
      {
        'Employee ID': 'VIT-0037',
        'Employee Name': 'Mustafa Ali Meer',
        'Start Date': '2025-01-01',
        'Position': 'Head of Credit',
        'Basic Salary': 1250000,
        'End Date': 'Present'
      }
    ];
    await exportFormattedExcelFromJson(
      wsData,
      'status_changes_template.xlsx',
      'Status_Changes_Template',
      isAr
    );
  };

  // Excel Export
  const handleExportExcel = async () => {
    const exportData = records.map(r => ({
      'Employee ID': r.employee_id,
      'Employee Name': r.employee_name,
      'Start Date': r.start_date,
      'Position': r.position,
      'Basic Salary': r.basic_salary,
      'End Date': r.end_date,
      'Notes': r.notes || ''
    }));
    await exportFormattedExcelFromJson(
      exportData,
      `status_changes_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Status_Changes',
      isAr
    );
  };

  // Excel Import
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws) as any[];

        json.forEach((row, idx) => {
          const empId = row['Employee ID'] || row['employee_id'] || row['الرقم الوظيفي'] || '';
          const empName = row['Employee Name'] || row['employee_name'] || row['اسم الموظف'] || '';
          const sDate = row['Start Date'] || row['start_date'] || row['تاريخ البدء'] || '';
          const pos = row['Position'] || row['position'] || row['المسمى الوظيفي'] || '';
          const sal = row['Basic Salary'] || row['basic_salary'] || row['الراتب الأساسي'] || 0;
          const eDate = row['End Date'] || row['end_date'] || row['تاريخ الانتهاء'] || '';
          const notes = row['Notes'] || row['notes'] || '';

          if (sDate && pos) {
            saveStatusChangeRecord({
              id: `sc-import-${Date.now()}-${idx}`,
              employee_id: empId,
              employee_name: empName,
              start_date: sDate,
              position: pos,
              basic_salary: Number(sal) || 0,
              end_date: eDate || 'Present',
              notes: notes
            });
          }
        });
        alert(isAr ? 'تم استيراد سجلات تغيير الحالة بنجاح' : 'Status changes imported successfully');
      } catch (err) {
        console.error(err);
        alert(isAr ? 'خطأ في معالجة ملف Excel' : 'Error importing Excel file');
      }
    };
    reader.readAsBinaryString(file);
  };

  const filtered = records.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.employee_name?.toLowerCase().includes(q) ||
      r.employee_id?.toLowerCase().includes(q) ||
      r.position?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/15 text-indigo-500 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">published_with_changes</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'جدول تغيير الحالة والتدرج الوظيفي (Status Change)' : 'Status Change Table'}</span>
              <span className="text-[11px] font-normal text-indigo-500 font-mono">
                ({isAr ? 'الجدول يبدأ من أول وظيفة' : 'Starts from first position'})
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'توثيق تاريخ البدء، المسمى الوظيفي، الراتب الأساسي، وتاريخ الانتهاء' : 'Record start date, position, basic salary, and end date'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!employee && (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث بالموظف أو المسمى...' : 'Search employee or position...'}
                className={`h-8 px-2.5 rounded-lg border text-xs focus:outline-none ${
                  isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />

              <button
                type="button"
                onClick={handleGenerateTemplate}
                className="h-8 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isAr ? 'قالب Excel' : 'Excel Template'}
              >
                <span className="material-symbols-outlined text-xs">table_view</span>
                <span className="hidden md:inline">{isAr ? 'قالب' : 'Template'}</span>
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="h-8 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isAr ? 'تصدير' : 'Export'}
              >
                <span className="material-symbols-outlined text-xs">download</span>
                <span className="hidden md:inline">{isAr ? 'تصدير' : 'Export'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 px-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isAr ? 'استيراد' : 'Import'}
              >
                <span className="material-symbols-outlined text-xs">upload_file</span>
                <span className="hidden md:inline">{isAr ? 'استيراد' : 'Import'}</span>
              </button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" />
            </>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-8 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-indigo-600/25"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{isAr ? 'إضافة تغيير حالة' : 'Add Status Change'}</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className={`overflow-x-auto ${isCompact ? 'max-h-[250px] overflow-y-auto profile-scrollbar' : ''} rounded-2xl border ${
        isDark ? 'border-white/10 bg-[#06080d]/60' : 'border-slate-200 bg-white shadow-xs'
      }`}>
        <table className="w-full text-xs text-start">
          <thead className={`${isCompact ? 'sticky top-0 z-10 shadow-xs' : ''} ${isDark ? 'bg-[#0f1422] text-slate-300' : 'bg-slate-100 text-slate-700'}`}>
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className="py-2.5 px-3 text-start w-10">#</th>
              {!employee && <th className="py-2.5 px-3 text-start">{isAr ? 'الموظف' : 'Employee'}</th>}
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ البدء (Start Date)' : 'Start Date'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'المسمى الوظيفي (Position)' : 'Position'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'الراتب الأساسي (Basic Salary)' : 'Basic Salary'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ الانتهاء (End Date)' : 'End Date'}</th>
              <th className="py-2.5 px-3 text-center w-20">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={employee ? 6 : 7} className="text-center py-6 text-slate-400">
                  {isAr ? 'لا توجد سجلات تغيير حالة مسجلة' : 'No status change records found'}
                </td>
              </tr>
            ) : (
              filtered.map((rec, index) => {
                const isCurrent = String(rec.end_date).includes('الحالي') || String(rec.end_date).toLowerCase().includes('present') || !rec.end_date;
                return (
                  <tr key={rec.id || index} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/70'}>
                    <td className="py-2 px-3 font-mono text-slate-400 text-start">{index + 1}</td>
                    {!employee && (
                      <td className="py-2 px-3 text-start">
                        <div className="font-bold text-slate-900 dark:text-white">{rec.employee_name}</div>
                        <div className="text-[10px] font-mono text-indigo-400">{rec.employee_id}</div>
                      </td>
                    )}
                    <td className="py-2 px-3 font-mono font-bold text-blue-600 dark:text-blue-400 text-start">
                      {rec.start_date}
                      {index === 0 && (
                        <span className="ms-1.5 px-1.5 py-0.2 rounded text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {isAr ? 'أول وظيفة' : '1st Position'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 text-start">
                      {rec.position}
                    </td>
                    <td className="py-2 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-start">
                      {Number(rec.basic_salary) ? Number(rec.basic_salary).toLocaleString() + ' د.ع' : '-'}
                    </td>
                    <td className="py-2 px-3 text-start">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                          {isAr ? 'الحالي (مستمر)' : 'Present (Active)'}
                        </span>
                      ) : (
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {rec.end_date}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rec)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-500 hover:bg-indigo-500/10 cursor-pointer"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title={isAr ? 'حذف' : 'Delete'}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl p-5 border shadow-2xl ${
            isDark ? 'bg-[#0f1420] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 mb-3">
              <h4 className="font-bold text-sm text-indigo-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">published_with_changes</span>
                <span>{editingRecord ? (isAr ? 'تعديل تغيير الحالة' : 'Edit Status Change') : (isAr ? 'إضافة تغيير حالة وتدرج وظيفي' : 'Add Status Change')}</span>
              </h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              {!employee && (
                <div>
                  <label className="block text-[11px] font-semibold mb-1">{isAr ? 'اختر الموظف' : 'Select Employee'}</label>
                  <select
                    value={formEmployeeId}
                    onChange={e => {
                      const emp = employees.find(x => (x.employeeId || x.badgeNo || `VIT-${x.id}`) === e.target.value);
                      setFormEmployeeId(e.target.value);
                      if (emp) setFormEmployeeName(emp.fullName || emp.fullNameEn || '');
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {employees.map(emp => {
                      const code = emp.employeeId || emp.badgeNo || `VIT-${emp.id}`;
                      const name = emp.fullName || emp.fullNameEn;
                      return <option key={code} value={code}>{name} ({code})</option>;
                    })}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'المسمى الوظيفي (Position)' : 'Position'}</label>
                <input
                  type="text"
                  value={formPosition}
                  onChange={e => setFormPosition(e.target.value)}
                  placeholder="Senior Credit Officer / مدير قسم"
                  required
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ البدء (Start Date)' : 'Start Date'}</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    required
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ الانتهاء (End Date)' : 'End Date'}</label>
                  <input
                    type="text"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    placeholder={isAr ? '2024-12-31 أو الحالي' : '2024-12-31 or Present'}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'الراتب الأساسي (Basic Salary)' : 'Basic Salary'}</label>
                <input
                  type="number"
                  value={formSalary}
                  onChange={e => setFormSalary(e.target.value)}
                  placeholder="1250000"
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'ملاحظات' : 'Notes'}</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder={isAr ? 'التعيين، الترقية، قرار إداري...' : 'Promotion, initial hire...'}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs"
                >
                  {isAr ? 'حفظ السجل' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
