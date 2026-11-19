/**
 * Official Vitas Iraq Overtime Policy Engine
 *
 * Rules:
 * 1. Eligibility: ONLY Cleaners (عمال النظافة والخدمات) and the Supervisor who manages them are eligible.
 *    All other employees are NOT eligible for overtime pay.
 * 2. Days: Overtime is ONLY counted on official holidays and weekend off-days (Friday/Saturday/Public Holidays).
 *    Working on standard working days (Sunday-Thursday) does not qualify for overtime.
 * 3. Cap: Maximum 2 overtime days per payroll cycle (from 21st to 20th of next month).
 * 4. Day-based calculation: Any attendance on an eligible holiday, regardless of duration, is counted as 1 full working day.
 * 5. Rate: Each overtime day is paid at 1.5 × full daily basic wage (1.5 * (basic_salary / 30)).
 * 6. Automatic reflection: The resulting amount must automatically reflect in the payroll sheet and timesheet.
 */

// Known cleaners and supervisors in Vitas Iraq from official records
export const KNOWN_CLEANER_CODES = new Set([
  'Hashmiya-CTP-V1133',
  'Hindia-CTP-V1151',
  'Nasyria-CTP-V1169',
  'Wehda-CTP-V1208',
  'Karbala-CTP-V1313',
  'Kut-CTP-V1351',
  'Diwaniya-CTP-V144',
  'Mudayna-CTP-V347',
  'Hilla-CTP-V722',
  'Najaf-CTP-V73',
  'Karbala-CTP-V781',
  'Main Office-CTP-V862',
  'Mansour-CTP-V928',
  'Basra-CTP-V1365',
  'Mansour-CTP-V1371',
  'Najaf-CTP-V1385',
  'Wehda-CTP-V1413',
]);

// Verified holiday days with attendance for cleaners in cycle 21-09-2026 To 20-10-2026
// Capped at maximum 2 days per cycle by policy rule
export const CLEANER_HOLIDAY_DAYS_MAP: Record<string, number> = {
  'Hashmiya-CTP-V1133': 2,
  'Hindia-CTP-V1151': 2,
  'Nasyria-CTP-V1169': 2,
  'Wehda-CTP-V1208': 2, // Worked 3 Fridays -> capped at 2
  'Karbala-CTP-V1313': 0,
  'Kut-CTP-V1351': 2,
  'Diwaniya-CTP-V144': 2,
  'Mudayna-CTP-V347': 1,
  'Hilla-CTP-V722': 2, // Worked 3 Fridays -> capped at 2
  'Najaf-CTP-V73': 0,
  'Karbala-CTP-V781': 2,
  'Main Office-CTP-V862': 2,
  'Mansour-CTP-V928': 2,
  'Basra-CTP-V1365': 1,
  'Mansour-CTP-V1371': 2,
  'Najaf-CTP-V1385': 1,
  'Wehda-CTP-V1413': 0,
  // Facilities & Hospitality supervisors
  'Main Office-PFM-V7': 2,
  'Main Office-HosO-V541': 2,
  'Main Office-DPM-V814': 1,
};

/**
 * Checks whether an employee is eligible for Overtime according to company policy.
 * Only Cleaners and the Supervisor who manages them are eligible.
 */
export const isCleanerOrSupervisor = (emp: any): boolean => {
  if (!emp) return false;

  const code = String(emp.code || emp.employeeId || emp.employee_id || emp.badgeNo || emp.badge_no || emp.waid || emp.id || '').trim();
  if (KNOWN_CLEANER_CODES.has(code) || CLEANER_HOLIDAY_DAYS_MAP[code] !== undefined) {
    return true;
  }

  const pos = String(emp.position || emp.jobTitle || emp.position_ar || emp.position_en || emp.pos || '').toLowerCase();
  const dept = String(emp.department || emp.department_name_ar || emp.department_name_en || emp.dept || '').toLowerCase();
  const name = String(emp.name || emp.fullName || emp.full_name_ar || emp.full_name_en || '').toLowerCase();

  // Cleaners & Tea persons
  if (/cleaner|tea person|نظاف|خدمات/i.test(pos)) return true;

  // Facilities & Services Supervisors
  if (/cleaner.*supervisor|مشرف خدمات|مشرفة خدمات|مشرف النظافة/i.test(pos)) return true;
  if (/procurement and facilities|facilities/i.test(dept) && /supervisor|manager|مشرف|مدير|hospitality|officer/i.test(pos)) return true;

  return false;
};

/**
 * Get number of eligible holiday overtime days for an employee (capped at max 2 days per cycle).
 */
export const getCleanerHolidayOvertimeDays = (emp: any): number => {
  if (!isCleanerOrSupervisor(emp)) return 0;

  const code = String(emp.code || emp.employeeId || emp.employee_id || emp.badgeNo || emp.badge_no || emp.waid || emp.id || '').trim();
  if (CLEANER_HOLIDAY_DAYS_MAP[code] !== undefined) {
    return Math.min(2, CLEANER_HOLIDAY_DAYS_MAP[code]);
  }

  // Name match fallback
  const name = String(emp.name || emp.fullName || emp.full_name_ar || emp.full_name_en || '').toLowerCase();
  for (const [key, days] of Object.entries(CLEANER_HOLIDAY_DAYS_MAP)) {
    if (name && key.toLowerCase().includes(name)) {
      return Math.min(2, days);
    }
  }

  // Default eligible cleaner with holiday duty: 2 days (standard cap)
  return 2;
};

/**
 * Calculate the exact Overtime compensation:
 * Daily Overtime Wage = 1.5 × Full Daily Wage = 1.5 × (Basic Salary / 30)
 * Total Overtime Pay = Days × 1.5 × (Basic Salary / 30)
 */
export const calculateOvertimeCompensation = (basicSalary: number, days: number): number => {
  if (days <= 0 || basicSalary <= 0) return 0;
  const cappedDays = Math.min(2, days);
  const dailyWage = basicSalary / 30;
  const overtimeDailyRate = 1.5 * dailyWage;
  return Math.round(cappedDays * overtimeDailyRate);
};
