/**
 * Utility helper to format Iraqi mobile and phone numbers ensuring the leading 0 always appears.
 * Examples:
 *   7804281866       -> 07804281866
 *   07804281866      -> 07804281866
 *   +9647804281866   -> 07804281866
 *   +964 780 4281866 -> 07804281866
 *   009647804281866  -> 07804281866
 */
export const formatIraqiPhoneNumber = (raw: any): string => {
  if (raw === null || raw === undefined) return '';
  const str = String(raw).trim();
  if (!str || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') return '';

  // Handle multiple phone numbers separated by '/', ',', '،', or '|'
  const separators = [' / ', '/', ' , ', ',', ' ، ', '،', ' - ', ' | '];
  for (const sep of separators) {
    if (str.includes(sep)) {
      return str
        .split(sep)
        .map(part => formatIraqiPhoneNumber(part.trim()))
        .filter(Boolean)
        .join(sep.trim() === '/' ? ' / ' : ' ، ');
    }
  }

  // Remove whitespace and hyphens
  let clean = str.replace(/[\s\-\(\)]/g, '');

  // International Iraqi prefix +964 or 00964 or 964
  if (clean.startsWith('+964')) {
    clean = '0' + clean.slice(4);
  } else if (clean.startsWith('00964')) {
    clean = '0' + clean.slice(5);
  } else if (clean.startsWith('964') && clean.length >= 12) {
    clean = '0' + clean.slice(3);
  }

  // If 10 digits starting with '7' (e.g. 7804281866, 770..., 750...), prepend '0'
  if (/^7\d{9}$/.test(clean)) {
    clean = '0' + clean;
  }

  // If 9 or 10 digits starting with 1-9 (and not already starting with 0), ensure leading 0 for Iraqi mobile
  if (/^[1-9]\d{8,9}$/.test(clean) && !clean.startsWith('0')) {
    clean = '0' + clean;
  }

  return clean;
};
