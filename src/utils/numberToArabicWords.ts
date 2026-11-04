/**
 * Utility to convert numbers to Arabic words (Tafqeet / تفقيط)
 */

export function numberToArabicWords(n: number): string {
  if (!n || isNaN(n) || n === 0) return '';
  n = Math.round(Math.abs(n));

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
    'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر',
    'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مئة', 'مئتان', 'ثلاثمئة', 'أربعمئة', 'خمسمئة', 'ستمئة', 'سبعمئة', 'ثمانمئة', 'تسعمئة'];

  const convertHundreds = (num: number): string => {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const o = num % 10;
      return o > 0 ? `${ones[o]} و${tens[t]}` : tens[t];
    }
    const h = Math.floor(num / 100);
    const rest = num % 100;
    return rest > 0 ? `${hundreds[h]} و${convertHundreds(rest)}` : hundreds[h];
  };

  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  if (billions > 0) parts.push(`${convertHundreds(billions)} مليار`);
  if (millions === 1) parts.push('مليون');
  else if (millions === 2) parts.push('مليونان');
  else if (millions > 2) parts.push(`${convertHundreds(millions)} ملايين`);

  if (thousands === 1) parts.push('ألف');
  else if (thousands === 2) parts.push('ألفان');
  else if (thousands > 2 && thousands < 11) parts.push(`${convertHundreds(thousands)} آلاف`);
  else if (thousands >= 11) parts.push(`${convertHundreds(thousands)} ألف`);

  if (remainder > 0) parts.push(convertHundreds(remainder));

  return parts.join(' و') + ' دينار عراقي';
}

