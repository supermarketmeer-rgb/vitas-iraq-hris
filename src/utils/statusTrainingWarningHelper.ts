// Helper and data management for Status Changes, Trainings, and Warnings
// Provides unified persistence, reactivity, and Excel import/export helpers

export interface StatusChangeRecord {
  id: string | number;
  employee_id: string;
  employee_name: string;
  start_date: string;
  position: string;
  basic_salary: number | string;
  end_date: string;
  notes?: string;
  created_at?: string;
}

export interface TrainingRecord {
  id: string | number;
  employee_id: string;
  employee_name: string;
  course_title: string;
  start_date: string;
  end_date: string;
  employer: string;
  notes?: string;
  created_at?: string;
}

export interface WarningRecord {
  id: string | number;
  employee_id: string;
  employee_name: string;
  warning_type: 'first' | 'second' | 'third' | 'تنبيه' | string;
  warning_date: string;
  warning_end_date: string;
  reason: string;
  status?: string;
  created_at?: string;
}

const STORAGE_KEY_STATUS = 'vitas_status_changes_list';
const STORAGE_KEY_TRAININGS = 'vitas_trainings_list';
const STORAGE_KEY_WARNINGS = 'vitas_warnings_list';

// Default baseline seeds
const defaultStatusChanges: StatusChangeRecord[] = [
  {
    id: 'sc-1',
    employee_id: 'VIT-0037',
    employee_name: 'Mustafa Ali Meer',
    start_date: '2023-04-26',
    position: 'مسؤول ائتمان أول / Senior Credit Officer',
    basic_salary: 1100000,
    end_date: '2024-12-31',
    notes: 'التعيين الأولي والمباشرة الرسمية'
  },
  {
    id: 'sc-2',
    employee_id: 'VIT-0037',
    employee_name: 'Mustafa Ali Meer',
    start_date: '2025-01-01',
    position: 'مسؤول قسم الائتمان / Head of Credit (G-4)',
    basic_salary: 1250000,
    end_date: 'الحالي / Present',
    notes: 'ترقية وتعديل الراتب والدرجة الوظيفية'
  },
  {
    id: 'sc-3',
    employee_id: 'VIT-0003',
    employee_name: 'Noor Fadhil Abbas',
    start_date: '2022-12-27',
    position: 'مسؤول موارد بشرية / HR Officer',
    basic_salary: 1400000,
    end_date: 'الحالي / Present',
    notes: 'المباشرة بالوظيفة'
  }
];

const defaultTrainings: TrainingRecord[] = [
  {
    id: 'tr-1',
    employee_id: 'VIT-0037',
    employee_name: 'Mustafa Ali Meer',
    course_title: 'إدارة المخاطر والتحليل المالي المتقدم (Advanced Financial Analysis)',
    start_date: '2024-03-10',
    end_date: '2024-03-25',
    employer: 'مؤسسة التمويل الدولية (IFC) / Vitas Iraq',
    notes: 'دورة معتمدة بشهادة تقديرية'
  },
  {
    id: 'tr-2',
    employee_id: 'VIT-0037',
    employee_name: 'Mustafa Ali Meer',
    course_title: 'مكافحة غسل الأموال والامتثال الرقابي (AML/CFT Regulations)',
    start_date: '2025-06-01',
    end_date: '2025-06-15',
    employer: 'البنك المركزي العراقي (CBI)',
    notes: 'برنامج الامتثال السنوي الإلزامي'
  },
  {
    id: 'tr-3',
    employee_id: 'VIT-0003',
    employee_name: 'Noor Fadhil Abbas',
    course_title: 'قانون العمل العراقي وإدارة الموارد البشرية الاحترافية',
    start_date: '2023-09-05',
    end_date: '2023-09-20',
    employer: 'وزارة العمل والشؤون الاجتماعية',
    notes: 'معايير العقود والتأمينات'
  }
];

const defaultWarnings: WarningRecord[] = [
  {
    id: 'warn-1',
    employee_id: 'VIT-0037',
    employee_name: 'Mustafa Ali Meer',
    warning_type: 'تنبيه',
    warning_date: '2025-02-10',
    warning_end_date: '2025-08-10',
    reason: 'التأخر عن الاجتماع الدوري لفرع البصرة دون إشعار مسبق',
    status: 'Active'
  },
  {
    id: 'warn-2',
    employee_id: 'VIT-0036',
    employee_name: 'Muntadhar Saad Hameed',
    warning_type: 'first',
    warning_date: '2025-04-12',
    warning_end_date: '2025-10-12',
    reason: 'عدم استكمال تدقيق ملفات الائتمان في الموعد المحدد',
    status: 'Active'
  }
];

// Helper to normalize employee ID for matching
export const normalizeEmpCode = (val: any): string => {
  if (!val) return '';
  return String(val).trim().toUpperCase();
};

export const matchesEmp = (recordEmpId: any, targetEmp: any): boolean => {
  if (!recordEmpId || !targetEmp) return false;
  const targetCode = normalizeEmpCode(targetEmp.employeeId || targetEmp.badgeNo || targetEmp.badge_no || targetEmp.id || '');
  const targetNum = String(targetEmp.id || '').trim();
  const recCode = normalizeEmpCode(recordEmpId);

  return recCode === targetCode ||
    recCode === `VIT-${targetNum.padStart(4, '0')}` ||
    recCode === targetNum ||
    (recCode && targetCode.includes(recCode)) ||
    (recCode && recCode.includes(targetCode));
};

// ======================== STATUS CHANGES ========================

export const getStatusChangesList = (): StatusChangeRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATUS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  // Initialize with baseline
  try {
    localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(defaultStatusChanges));
  } catch (e) {}
  return defaultStatusChanges;
};

export const getEmployeeStatusChanges = (employee: any): StatusChangeRecord[] => {
  if (!employee) return [];
  const all = getStatusChangesList();
  const matched = all.filter(sc => matchesEmp(sc.employee_id, employee) || (sc.employee_name && (sc.employee_name === employee.fullName || sc.employee_name === employee.fullNameEn)));

  // If no records found for this employee, synthesize their first position + current position baseline
  if (matched.length === 0) {
    const empCode = employee.employeeId || employee.badgeNo || employee.badge_no || `VIT-${String(employee.id || 1).padStart(4, '0')}`;
    const empName = employee.fullName || employee.fullNameEn || 'الموظف';
    const firstStart = employee.originalStartDate || employee.joinDate || employee.contractStartDate || '2023-01-01';
    const curStart = employee.contractStartDate || firstStart;
    const curSalary = Number(employee.basicSalary || employee.salary || employee.basic_salary) || 1250000;
    const curPos = employee.jobTitle || 'موظف';

    const baseline: StatusChangeRecord[] = [];

    // First position (الجدول يبدأ من اول وظيفة)
    if (firstStart !== curStart) {
      baseline.push({
        id: `auto-first-${employee.id || 1}`,
        employee_id: empCode,
        employee_name: empName,
        start_date: firstStart,
        position: `${curPos} (المباشرة الأولى)`,
        basic_salary: Math.round(curSalary * 0.85 / 25000) * 25000,
        end_date: curStart,
        notes: 'التعيين والمباشرة الأولى'
      });
    }

    // Current position
    baseline.push({
      id: `auto-cur-${employee.id || 1}`,
      employee_id: empCode,
      employee_name: empName,
      start_date: curStart,
      position: curPos,
      basic_salary: curSalary,
      end_date: 'الحالي / Present',
      notes: 'الوظيفة الحالية المعتمدة'
    });

    return baseline;
  }

  // Ensure chronological order starting from the earliest first position
  return [...matched].sort((a, b) => new Date(a.start_date || '1970-01-01').getTime() - new Date(b.start_date || '1970-01-01').getTime());
};

export const saveStatusChangeRecord = (record: StatusChangeRecord): StatusChangeRecord[] => {
  const list = getStatusChangesList();
  const index = list.findIndex(r => String(r.id) === String(record.id));
  let updated: StatusChangeRecord[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = record;
  } else {
    updated = [record, ...list];
  }
  localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_status_changes_updated', { detail: updated }));
  return updated;
};

export const deleteStatusChangeRecord = (id: string | number): StatusChangeRecord[] => {
  const list = getStatusChangesList();
  const updated = list.filter(r => String(r.id) !== String(id));
  localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_status_changes_updated', { detail: updated }));
  return updated;
};

// ======================== TRAININGS ========================

export const getTrainingsList = (): TrainingRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRAININGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  try {
    localStorage.setItem(STORAGE_KEY_TRAININGS, JSON.stringify(defaultTrainings));
  } catch (e) {}
  return defaultTrainings;
};

export const getEmployeeTrainings = (employee: any): TrainingRecord[] => {
  if (!employee) return [];
  const all = getTrainingsList();
  return all.filter(tr => matchesEmp(tr.employee_id, employee) || (tr.employee_name && (tr.employee_name === employee.fullName || tr.employee_name === employee.fullNameEn)))
    .sort((a, b) => new Date(b.start_date || '1970-01-01').getTime() - new Date(a.start_date || '1970-01-01').getTime());
};

export const saveTrainingRecord = (record: TrainingRecord): TrainingRecord[] => {
  const list = getTrainingsList();
  const index = list.findIndex(r => String(r.id) === String(record.id));
  let updated: TrainingRecord[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = record;
  } else {
    updated = [record, ...list];
  }
  localStorage.setItem(STORAGE_KEY_TRAININGS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_trainings_updated', { detail: updated }));
  return updated;
};

export const deleteTrainingRecord = (id: string | number): TrainingRecord[] => {
  const list = getTrainingsList();
  const updated = list.filter(r => String(r.id) !== String(id));
  localStorage.setItem(STORAGE_KEY_TRAININGS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_trainings_updated', { detail: updated }));
  return updated;
};

// ======================== WARNINGS ========================

export const getWarningsList = (): WarningRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WARNINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  try {
    localStorage.setItem(STORAGE_KEY_WARNINGS, JSON.stringify(defaultWarnings));
  } catch (e) {}
  return defaultWarnings;
};

export const getEmployeeWarnings = (employee: any): WarningRecord[] => {
  if (!employee) return [];
  const all = getWarningsList();
  return all.filter(w => matchesEmp(w.employee_id, employee) || (w.employee_name && (w.employee_name === employee.fullName || w.employee_name === employee.fullNameEn)))
    .sort((a, b) => new Date(b.warning_date || '1970-01-01').getTime() - new Date(a.warning_date || '1970-01-01').getTime());
};

export const saveWarningRecord = (record: WarningRecord): WarningRecord[] => {
  const list = getWarningsList();
  const index = list.findIndex(r => String(r.id) === String(record.id));
  let updated: WarningRecord[];
  if (index >= 0) {
    updated = [...list];
    updated[index] = record;
  } else {
    updated = [record, ...list];
  }
  localStorage.setItem(STORAGE_KEY_WARNINGS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_warnings_updated', { detail: updated }));
  return updated;
};

export const deleteWarningRecord = (id: string | number): WarningRecord[] => {
  const list = getWarningsList();
  const updated = list.filter(r => String(r.id) !== String(id));
  localStorage.setItem(STORAGE_KEY_WARNINGS, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('vitas_warnings_updated', { detail: updated }));
  return updated;
};

// Helper label formatters for Warning Type
export const formatWarningType = (type: string, lang: string = 'ar'): { label: string; colorClass: string; badgeClass: string } => {
  const isAr = lang === 'ar';
  const clean = String(type || '').toLowerCase().trim();

  if (clean === 'first' || clean === 'أول' || clean === 'اول' || clean === 'إنذار أول' || clean === 'انذار اول') {
    return {
      label: isAr ? 'إنذار أول (First)' : 'First Warning',
      colorClass: 'text-amber-500',
      badgeClass: 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
    };
  }
  if (clean === 'second' || clean === 'ثان' || clean === 'ثاني' || clean === 'إنذار ثان' || clean === 'انذار ثاني') {
    return {
      label: isAr ? 'إنذار ثانٍ (Second)' : 'Second Warning',
      colorClass: 'text-orange-500',
      badgeClass: 'bg-orange-500/15 text-orange-500 border border-orange-500/30'
    };
  }
  if (clean === 'third' || clean === 'ثالث' || clean === 'إنذار ثالث' || clean === 'انذار ثالث') {
    return {
      label: isAr ? 'إنذار ثالث نهائي (Third)' : 'Third (Final) Warning',
      colorClass: 'text-rose-500',
      badgeClass: 'bg-rose-500/20 text-rose-500 border border-rose-500/40 font-bold'
    };
  }
  // Fallback: تنبيه
  return {
    label: isAr ? 'تنبيه ولفت نظر (Notice)' : 'Notice / Alert',
    colorClass: 'text-blue-500',
    badgeClass: 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
  };
};
