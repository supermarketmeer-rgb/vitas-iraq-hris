import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { exportFormattedExcelFromJson } from '../utils/excelFormatHelper';
import {
  TrainingRecord,
  getTrainingsList,
  getEmployeeTrainings,
  saveTrainingRecord,
  deleteTrainingRecord
} from '../utils/statusTrainingWarningHelper';

interface TrainingTableProps {
  employee?: any;
  employees?: any[];
  language?: string;
  theme?: string;
  isCompact?: boolean;
}

export const TrainingTable: React.FC<TrainingTableProps> = ({
  employee,
  employees = [],
  language = 'ar',
  theme = 'light',
  isCompact = false
}) => {
  const isAr = language === 'ar';
  const isDark = theme === 'dark';

  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TrainingRecord | null>(null);

  // Form State
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formEmployeeName, setFormEmployeeName] = useState('');
  const [formCourseTitle, setFormCourseTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEmployer, setFormEmployer] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    if (employee) {
      setRecords(getEmployeeTrainings(employee));
    } else {
      setRecords(getTrainingsList());
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('vitas_trainings_updated', handleUpdate);
    return () => window.removeEventListener('vitas_trainings_updated', handleUpdate);
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
    setFormCourseTitle('');
    setFormStartDate(new Date().toISOString().slice(0, 10));
    setFormEndDate('');
    setFormEmployer(isAr ? 'مؤسسة الإسكان التعاونية CHF / Vitas' : 'CHF / Vitas Iraq');
    setFormNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (rec: TrainingRecord) => {
    setEditingRecord(rec);
    setFormEmployeeId(rec.employee_id);
    setFormEmployeeName(rec.employee_name);
    setFormCourseTitle(rec.course_title);
    setFormStartDate(rec.start_date);
    setFormEndDate(rec.end_date);
    setFormEmployer(rec.employer);
    setFormNotes(rec.notes || '');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCourseTitle || !formStartDate) {
      alert(isAr ? 'يرجى إدخال عنوان الدورة وتاريخ البدء' : 'Please provide course title and start date');
      return;
    }

    const rec: TrainingRecord = {
      id: editingRecord ? editingRecord.id : `tr-${Date.now()}`,
      employee_id: formEmployeeId.trim(),
      employee_name: formEmployeeName.trim() || 'موظف',
      course_title: formCourseTitle.trim(),
      start_date: formStartDate,
      end_date: formEndDate.trim(),
      employer: formEmployer.trim() || 'Vitas Iraq',
      notes: formNotes.trim(),
      created_at: editingRecord?.created_at || new Date().toISOString()
    };

    saveTrainingRecord(rec);
    setShowModal(false);
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm(isAr ? 'هل أنت متأكد من حذف هذه الدورة التدريبية؟' : 'Are you sure you want to delete this training record?')) {
      deleteTrainingRecord(id);
    }
  };

  // Excel Template
  const handleGenerateTemplate = async () => {
    const wsData = [
      {
        'Employee ID': 'VIT-0037',
        'Employee Name': 'Mustafa Ali Meer',
        'Course Title': 'Financial Risk Management',
        'Start Date': '2024-03-10',
        'End Date': '2024-03-25',
        'Employer': 'IFC / Vitas Iraq'
      }
    ];
    await exportFormattedExcelFromJson(
      wsData,
      'trainings_template.xlsx',
      'Trainings_Template',
      isAr
    );
  };

  // Excel Export
  const handleExportExcel = async () => {
    const exportData = records.map(r => ({
      'Employee ID': r.employee_id,
      'Employee Name': r.employee_name,
      'Course Title': r.course_title,
      'Start Date': r.start_date,
      'End Date': r.end_date,
      'Employer': r.employer,
      'Notes': r.notes || ''
    }));
    await exportFormattedExcelFromJson(
      exportData,
      `trainings_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'Trainings',
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
          const title = row['Course Title'] || row['course_title'] || row['عنوان الدورة'] || '';
          const sDate = row['Start Date'] || row['start_date'] || row['تاريخ البدء'] || '';
          const eDate = row['End Date'] || row['end_date'] || row['تاريخ الانتهاء'] || '';
          const employerVal = row['Employer'] || row['employer'] || row['جهة التدريب'] || '';
          const notes = row['Notes'] || row['notes'] || '';

          if (title && sDate) {
            saveTrainingRecord({
              id: `tr-import-${Date.now()}-${idx}`,
              employee_id: empId,
              employee_name: empName,
              course_title: title,
              start_date: sDate,
              end_date: eDate,
              employer: employerVal || 'Vitas Iraq',
              notes: notes
            });
          }
        });
        alert(isAr ? 'تم استيراد سجلات التدريب بنجاح' : 'Trainings imported successfully');
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
      r.course_title?.toLowerCase().includes(q) ||
      r.employer?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3" style={{ direction: isAr ? 'rtl' : 'ltr' }}>
      {/* HEADER / TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-600/15 text-teal-500 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-lg">school</span>
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{isAr ? 'جدول الدورات والبرامج التدريبية (Training Table)' : 'Training Table'}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {isAr ? 'توثيق عنوان الدورة، تاريخ البدء، تاريخ الانتهاء، وجهة التدريب / صاحب العمل' : 'Record course title, start date, end date, and employer'}
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
                placeholder={isAr ? 'بحث بالدورة أو الموظف...' : 'Search course or employee...'}
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
            className="h-8 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-teal-600/25"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>{isAr ? 'إضافة دورة تدريبية' : 'Add Training'}</span>
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
              <th className="py-2.5 px-3 text-start">{isAr ? 'عنوان الدورة (Course Title)' : 'Course Title'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ البدء (Start Date)' : 'Start Date'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'تاريخ الانتهاء (End Date)' : 'End Date'}</th>
              <th className="py-2.5 px-3 text-start">{isAr ? 'جهة التدريب / صاحب العمل (Employer)' : 'Employer'}</th>
              <th className="py-2.5 px-3 text-center w-20">{isAr ? 'الإجراءات' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={employee ? 6 : 7} className="text-center py-6 text-slate-400">
                  {isAr ? 'لا توجد دورات تدريبية مسجلة' : 'No training records found'}
                </td>
              </tr>
            ) : (
              filtered.map((rec, index) => (
                <tr key={rec.id || index} className={isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50/70'}>
                  <td className="py-2 px-3 font-mono text-slate-400 text-start">{index + 1}</td>
                  {!employee && (
                    <td className="py-2 px-3 text-start">
                      <div className="font-bold text-slate-900 dark:text-white">{rec.employee_name}</div>
                      <div className="text-[10px] font-mono text-teal-400">{rec.employee_id}</div>
                    </td>
                  )}
                  <td className="py-2 px-3 font-bold text-slate-900 dark:text-white text-start">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-teal-500">verified</span>
                      <span>{rec.course_title}</span>
                    </div>
                    {rec.notes && <div className="text-[10px] text-slate-400 italic font-normal">{rec.notes}</div>}
                  </td>
                  <td className="py-2 px-3 font-mono text-blue-600 dark:text-blue-400 text-start font-bold">
                    {rec.start_date}
                  </td>
                  <td className="py-2 px-3 font-mono text-amber-600 dark:text-amber-400 text-start font-bold">
                    {rec.end_date || '-'}
                  </td>
                  <td className="py-2 px-3 text-start">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                      {rec.employer || 'Vitas Iraq'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(rec)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-500 hover:bg-teal-500/10 cursor-pointer"
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
              ))
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
              <h4 className="font-bold text-sm text-teal-500 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">school</span>
                <span>{editingRecord ? (isAr ? 'تعديل دورة تدريبية' : 'Edit Training Course') : (isAr ? 'إضافة دورة تدريبية جديدة' : 'Add Training Course')}</span>
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
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'عنوان الدورة / البرنامج التدريبي (Course Title)' : 'Course Title'}</label>
                <input
                  type="text"
                  value={formCourseTitle}
                  onChange={e => setFormCourseTitle(e.target.value)}
                  placeholder="Financial Risk Management / مهارات القيادة"
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
                    type="date"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${
                      isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'جهة التدريب / صاحب العمل (Employer)' : 'Employer'}</label>
                <input
                  type="text"
                  value={formEmployer}
                  onChange={e => setFormEmployer(e.target.value)}
                  placeholder="IFC / Vitas Iraq / البنك المركزي"
                  required
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none ${
                    isDark ? 'bg-black/30 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold mb-1">{isAr ? 'ملاحظات والشهادة' : 'Notes & Certification'}</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder={isAr ? 'شهادة تقديرية، دورة إلزامية...' : 'Certification details...'}
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
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white cursor-pointer shadow-xs"
                >
                  {isAr ? 'حفظ التدريب' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
