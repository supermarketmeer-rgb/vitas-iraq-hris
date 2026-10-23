import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { exportFormattedExcelFromJson } from '../utils/excelFormatHelper';
import {
  WarningRecord,
  getWarningsList,
  getEmployeeWarnings,
  saveWarningRecord,
  deleteWarningRecord,
  formatWarningType
} from '../utils/statusTrainingWarningHelper';

interface WarningTableProps {
  employee?: any;
  employees?: any[];
  language?: string;
  theme?: string;
  isCompact?: boolean;
}

export const WarningTable: React.FC<WarningTableProps> = ({
  employee,
  employees = [],
  language = 'ar',
  theme = 'light',
  isCompact = false
}) => {
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [records, setRecords] = useState<WarningRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WarningRecord | null>(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formWarningType, setFormWarningType] = useState<'first' | 'second' | 'third' | 'تنبيه' | string>('تنبيه');
  const [formWarningDate, setFormWarningDate] = useState('');
  const [formWarningEndDate, setFormWarningEndDate] = useState('');
  const [formReason, setFormReason] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    if (employee) {
      setRecords(getEmployeeWarnings(employee));
    } else {
      setRecords(getWarningsList());
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('vitas_warnings_updated', handleUpdate);
    return () => window.removeEventListener('vitas_warnings_updated', handleUpdate);
  }, [employee]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    if (employee) {
      const empCode = employee.employeeId || employee.badgeNo || employee.badge_no || `VIT-${String(employee.id || 1).padStart(4, '0')}`;
      const empName = employee.fullName || employee.fullNameEn || 'الموظف';
      setFormEmployeeId(empCode);
      setFormEmployeeName(empName);
    } else {
      setFormEmployeeId(employees[0]?.employeeId || employees[0]?.badgeNo || 'VIT-0001');
      setFormEmployeeName(employees[0]?.fullName || employees[0]?.fullNameEn || '');
    }
    setFormWarningType('تنبيه');
    setFormWarningDate(new Date().toISOString().slice(0, 10));
    // Default expiry 6 months from now
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    setFormWarningEndDate(d.toISOString().slice(0, 10));
    setFormReason('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec: WarningRecord) => {
    setEditingRecord(rec);
    setFormEmployeeId(rec.employee_id);
    setFormEmployeeName(rec.employee_name);
    setFormWarningType(rec.warning_type);
    setFormWarningDate(rec.warning_date);
    setFormWarningEndDate(rec.warning_end_date);
    setFormReason(rec.reason);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formWarningType || !formWarningDate || !formReason) {
      alert(isAr ? 'يرجى إدخال نوع وتاريخ وسبب الإنذار' : 'Please provide warning type, date, and reason');
      return;
    }

    const rec: WarningRecord = {
      id: editingRecord ? editingRecord.id : `warn-${Date.now()}`,
      employee_id: formEmployeeId.trim(),
      employee_name: formEmployeeName.trim() || 'موظف',
      warning_type: formWarningType,
      warning_date: formWarningDate,
      warning_end_date: formWarningEndDate.trim(),
      reason: formReason.trim(),
      status: 'Active',
      created_at: editingRecord?.created_at || new Date().toISOString()
    };

    saveWarningRecord(rec);
    setShowModal(false);
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الإنذار؟' : 'Are you sure you want to delete this warning record?')) {
      deleteWarningRecord(id);
    }
  };

  // Excel Template
  const handleGenerateTemplate = async () => {
    const wsData = [
      {
        'Employee ID': 'VIT-0037',
        'Employee Name': 'Mustafa Ali Meer',
        'Warning Type': 'تنبيه',
        'Warning Date': '2025-02-10',
        'Warning End Date': '2025-08-10',
        'Reason': 'Late arrival to monthly branch meeting without prior notice'
      },
      {
        'Employee ID': 'VIT-0036',
        'Employee Name': 'Muntadhar Saad Hameed',
        'Warning Type': 'first',
        'Warning Date': '2025-04-12',
        'Warning End Date': '2025-10-12',
        'Reason': 'Delay in submitting loan audit documentation'
      }
    ];
    await exportFormattedExcelFromJson(
      wsData,
      'warnings_template.xlsx',
      'Warnings_Template',
      isAr
    );
  };

  // Excel Export
  const handleExportExcel = async () => {
    const exportData = records.map(r => ({
      'Employee ID': r.employee_id,
      'Employee Name': r.employee_name,
      'Warning Type': r.warning_type,
      'Warning Date': r.warning_date,
      'Warning End Date': r.warning_end_date,
      'Reason': r.reason
    }));
    await exportFormattedExcelFromJson(
      exportData,
      `warnings_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Warnings',
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
          const wType = row['Warning Type'] || row['warning_type'] || row['نوع الإنذار'] || 'تنبيه';
          const wDate = row['Warning Date'] || row['warning_date'] || row['تاريخ الإنذار'] || '';
          const weDate = row['Warning End Date'] || row['warning_end_date'] || row['تاريخ الانتهاء'] || '';
          const reasonVal = row['Reason'] || row['reason'] || row['سبب الإنذار'] || '';

          if (wDate && reasonVal) {
            saveWarningRecord({
              id: `warn-import-${Date.now()}-${idx}`,
              employee_id: empId,
              employee_name: empName,
              warning_type: wType,
              warning_date: wDate,
              warning_end_date: weDate,
              reason: reasonVal,
              status: 'Active'
            });
          }
        });
        alert(isAr ? 'تم استيراد سجلات الإنذارات بنجاح' : 'Warnings imported successfully');
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
      r.warning_type?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-600/15 text-rose-500 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">warning</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'جدول الإنذارات والتنبيهات (Warning Table)' : 'Warnings Table'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'نوع الإنذار (first, second, third, تنبيه)، تاريخ الإنذار، تاريخ انتهاء الإنذار، وسبب الإنذار' : 'Warning type (first, second, third, notice), warning date, warning end date, and reason'}
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
                placeholder={isAr ? 'بحث بالإنذار أو الموظف...' : 'Search warning or employee...'}
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
            className="h-8 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-rose-600/25"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{isAr ? 'إضافة إنذار / تنبيه' : 'Add Warning'}</span>
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
              <th className="py-2.5 px-3 text-start">{isAr ? 'نوع الإنذار (Warning Type)' : 'Warning Type'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ الإنذار (Warning Date)' : 'Warning Date'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ الانتهاء (Warning End Date)' : 'Warning End Date'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'السبب (Reason)' : 'Reason'}</th>
              <th className="py-2.5 px-3 text-center w-20">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={employee ? 6 : 7} className="text-center py-6 text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-2xl text-emerald-500">verified_user</span>
                    <span>{isAr ? 'السجل نظيف - لا توجد أي إنذارات أو عقوبات مسجلة' : 'Clean record - no warnings registered'}</span>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((rec, index) => {
                const typeInfo = formatWarningType(rec.warning_type, language);
                return (
                  <tr key={rec.id || index} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/70'}>
                    <td className="py-2 px-3 font-mono text-slate-400 text-start">{index + 1}</td>
                    {!employee && (
                      <td className="py-2 px-3 text-start">
                        <div className="font-bold text-slate-900 dark:text-white">{rec.employee_name}</div>
                        <div className="text-[10px] font-mono text-rose-400">{rec.employee_id}</div>
                      </td>
                    )}
                    <td className="py-2 px-3 text-start">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeInfo.badgeClass}`}>
                        <span className="material-symbols-outlined text-xs">gavel</span>
                        <span>{typeInfo.label}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-rose-600 dark:text-rose-400 text-start font-bold">
                      {rec.warning_date}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500 dark:text-slate-400 text-start">
                      {rec.warning_end_date || '-'}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200 text-start max-w-xs">
                      {rec.reason}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rec)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title={isAr ? 'تعديل' : 'Edit'}
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rec.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
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
              <h4 className="font-bold text-sm text-rose-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>{editingRecord ? (isAr ? 'تعديل إنذار' : 'Edit Warning') : (isAr ? 'إضافة إنذار أو تنبيه' : 'Add Warning')}</span>
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
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'نوع الإنذار (Warning Type)' : 'Warning Type'}</label>
                <select
                  value={formWarningType}
                  onChange={e => setFormWarningType(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="تنبيه">{isAr ? 'تنبيه ولفت نظر (Notice)' : 'Notice / Alert'}</option>
                  <option value="first">{isAr ? 'إنذار أول (First Warning)' : 'First Warning (first)'}</option>
                  <option value="second">{isAr ? 'إنذار ثانٍ (Second Warning)' : 'Second Warning (second)'}</option>
                  <option value="third">{isAr ? 'إنذار ثالث نهائي (Third Warning)' : 'Third Final Warning (third)'}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ الإنذار (Warning Date)' : 'Warning Date'}</label>
                  <input
                    type="date"
                    value={formWarningDate}
                    onChange={e => setFormWarningDate(e.target.value)}
                    required
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold mb-1">{isAr ? 'تاريخ الانتهاء (Warning End Date)' : 'End Date'}</label>
                  <input
                    type="date"
                    value={formWarningEndDate}
                    onChange={e => setFormWarningEndDate(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'سبب وحيثيات الإنذار (Reason)' : 'Reason'}</label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={e => setFormReason(e.target.value)}
                  placeholder={isAr ? 'أسباب صدور الإنذار ومخالفة اللائحة الانضباطية...' : 'Disciplinary violation details...'}
                  required
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
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs"
                >
                  {isAr ? 'حفظ الإنذار' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
