/**
 * Utility to identify employees belonging to the Lebanon Regional Office.
 * Per policy, Lebanon staff are managed in their dedicated regional module
 * and must not appear in the Iraq Payroll or Attendance modules.
 */
export function isLebanonEmployee(emp: any): boolean {
  if (!emp) return false;

  // Explicit flags
  if (emp.is_lebanon || emp.isLebanon) return true;

  // Country
  const country = String(emp.country || '').trim().toLowerCase();
  if (country === 'lebanon' || country === 'لبنان') return true;

  // Branch / Office / Location
  const branchFields = [
    emp.branch,
    emp.branch_ar,
    emp.branch_en,
    emp.branchEn,
    emp.location_ar,
    emp.location_en,
    emp.office,
    emp.fullOfficeName,
    emp.branch_name_ar,
    emp.branch_name_en,
  ];

  for (const field of branchFields) {
    if (!field) continue;
    const str = String(field).trim().toLowerCase();
    if (
      str.includes('lebanon') ||
      str.includes('لبنان') ||
      str.includes('beirut') ||
      str.includes('بيروت') ||
      str === 'atas' ||
      str.includes('atas')
    ) {
      return true;
    }
  }

  // Employee Code / ID
  const codeFields = [
    emp.employeeCode,
    emp.employee_code,
    emp.employeeId,
    emp.employee_id,
    emp.badgeNo,
    emp.badge_no,
    emp.biometric_id,
    emp.employee_number,
    emp.id,
  ];

  for (const field of codeFields) {
    if (!field) continue;
    const str = String(field).trim().toLowerCase();
    if (
      str.startsWith('lebanon') ||
      str.includes('lebanon-') ||
      str.includes('leb-') ||
      str.startsWith('leb_') ||
      str.includes('leb_')
    ) {
      return true;
    }
  }

  // Department
  const deptFields = [emp.department, emp.department_ar, emp.department_en, emp.department_name_ar, emp.department_name_en];
  for (const field of deptFields) {
    if (!field) continue;
    const str = String(field).trim().toLowerCase();
    if (str.includes('lebanon') || str.includes('لبنان') || str.includes('بيروت') || str.includes('beirut')) {
      return true;
    }
  }

  return false;
}

/**
 * Filter an array of employees, keeping only Iraq employees (excluding Lebanon)
 */
export function filterIraqEmployees<T = any>(employees: T[]): T[] {
  if (!Array.isArray(employees)) return [];
  return employees.filter(emp => !isLebanonEmployee(emp));
}
