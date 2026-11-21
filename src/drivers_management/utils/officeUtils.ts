/**
 * DTMS - Office Scoping & Comparison Utility
 * Ensures consistent scoping across supervisors, drivers, and admins.
 */

function getStoredOffices(): Array<{ id: string | number; name?: string; code?: string }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('dtms_offices_v2');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isSameOffice(
  officeA?: string | number | null,
  officeB?: string | number | null
): boolean {
  if (
    officeA === undefined ||
    officeA === null ||
    officeA === '' ||
    officeB === undefined ||
    officeB === null ||
    officeB === ''
  ) {
    return false;
  }
  const strA = String(officeA).trim();
  const strB = String(officeB).trim();
  if (strA === strB) return true;

  const cleanA = strA.replace(/^off-/, '').trim();
  const cleanB = strB.replace(/^off-/, '').trim();
  if (cleanA === cleanB) return true;

  // Check if both resolve to the same office in local storage
  const offices = getStoredOffices();
  if (offices && offices.length > 0) {
    const offObjA = offices.find(
      (o) =>
        String(o.id) === strA ||
        String(o.id).replace(/^off-/, '').trim() === cleanA ||
        (o.name && o.name.trim() === strA) ||
        (o.code && o.code.trim() === strA)
    );
    const offObjB = offices.find(
      (o) =>
        String(o.id) === strB ||
        String(o.id).replace(/^off-/, '').trim() === cleanB ||
        (o.name && o.name.trim() === strB) ||
        (o.code && o.code.trim() === strB)
    );
    if (offObjA && offObjB) {
      if (String(offObjA.id) === String(offObjB.id)) return true;
      if (offObjA.name && offObjB.name && offObjA.name.trim() === offObjB.name.trim()) return true;
      if (offObjA.code && offObjB.code && offObjA.code.trim() === offObjB.code.trim()) return true;
    }
  }

  return false;
}

export function isOfficeRestricted(user?: { role?: string; office_id?: string | number } | null): boolean {
  return user?.role === 'supervisor';
}
