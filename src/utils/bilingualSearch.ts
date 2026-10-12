import { hasArabicCharacters, transliterateEnglishNameToArabic, NAME_MAP_EN_TO_AR } from './nameHelper';

/**
 * Normalizes Arabic text by stripping diacritics (tashkeel),
 * unifying Alef forms (أ, إ, آ, ٱ -> ا), Ta Marbuta (ة -> ه),
 * Alef Maksura (ى -> ي), Hamza forms, removing tatweel and punctuation.
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel / harakat
    .replace(/[أإآٱ]/g, 'ا') // unify alef
    .replace(/ة/g, 'ه') // unify ta marbuta with ha
    .replace(/ى/g, 'ي') // unify alef maksura with ya
    .replace(/[ؤئ]/g, 'ء') // unify hamzas
    .replace(/ـ/g, '') // remove tatweel
    .replace(/[_\-/\\.,:;+*#@!$%^&()[\]{}|<>?"'`~]/g, ' ') // replace punctuation/underscores with space
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Normalizes English / Latin text: lowercasing, replacing punctuation/underscores with spaces.
 */
export function normalizeEnglishText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[_\-/\\.,:;+*#@!$%^&()[\]{}|<>?"'`~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common Iraqi branches & cities with bilingual equivalents
 */
const BRANCH_SYNONYMS: Record<string, string[]> = {
  baghdad: ['بغداد', 'baghdad', 'العاصمة', 'capital'],
  mansour: ['المنصور', 'منصور', 'mansour', 'mansoor', 'mansur'],
  wahda: ['الوحدة', 'وحدة', 'wahda', 'al-wahda', 'alwahda'],
  karrada: ['الكرادة', 'كرادة', 'karrada', 'karradah'],
  shaab: ['الشعب', 'شعب', 'shaab', 'al-shaab'],
  kut: ['الكوت', 'كوت', 'kut', 'al-kut', 'alkut', 'واسط', 'wasit'],
  basra: ['البصرة', 'بصرة', 'basra', 'basrah', 'al-basra', 'albasra'],
  najaf: ['النجف', 'نجف', 'najaf', 'al-najaf', 'alnajaf'],
  karbala: ['كربلاء', 'كربلا', 'karbala', 'kerbala', 'al-karbala'],
  babylon: ['بابل', 'الحلة', 'حلة', 'الهاشمية', 'هاشمية', 'babylon', 'hilla', 'babel', 'hashimiya'],
  sulaymaniyah: ['السليمانية', 'سليمانية', 'sulaymaniyah', 'sulaimani', 'sulaimaniyah', 'slemani', 'sulamaniyah'],
  erbil: ['اربيل', 'أربيل', 'erbil', 'arbil', 'hawler', 'هولير'],
  kirkuk: ['كركوك', 'kirkuk'],
  diwaniyah: ['الديوانية', 'ديوانية', 'diwaniyah', 'diwaniya', 'القادسية', 'qadisiyah'],
  nasiriyah: ['الناصرية', 'ناصرية', 'nasiriyah', 'nasiriya', 'ذي قار', 'dhi qar', 'thi qar'],
  maysan: ['ميسان', 'العمارة', 'عمارة', 'maysan', 'amara', 'amarah'],
  duhok: ['دهوك', 'duhok', 'dohuk'],
  mosul: ['الموصل', 'موصل', 'نينوى', 'mosul', 'nineveh'],
  anbar: ['الانبار', 'أنبار', 'الرمادي', 'رمادي', 'anbar', 'ramadi'],
  samawa: ['السماوة', 'سماوة', 'المثنى', 'samawa', 'muthanna'],
  diyala: ['ديالى', 'بعقوبة', 'diyala', 'baquba'],
  hq: ['الادارة العامة', 'المقر الرئيسي', 'المركز الرئيسي', 'head office', 'hq']
};

/**
 * Common departments & job titles with bilingual equivalents
 */
const TITLE_DEPT_SYNONYMS: Record<string, string[]> = {
  loan_credit: ['قروض', 'قرض', 'ائتمان', 'الائتمان', 'تمويل', 'loan', 'credit', 'lending'],
  collector: ['محصل', 'تحصيل', 'جباية', 'collector', 'collection'],
  manager: ['مدير', 'ادارة', 'إدارة', 'مسؤول فرع', 'manager', 'head', 'lead', 'director'],
  officer: ['مسؤول', 'ضابط', 'officer'],
  driver: ['سائق', 'سايق', 'سياقة', 'شيفور', 'driver'],
  maintenance: ['صيانة', 'صيانه', 'فني', 'حرفي', 'معتمد', 'maintenance', 'technician'],
  cleaner: ['نظافة', 'نظافه', 'خدمات', 'عمال نظافة', 'cleaner', 'cleaning', 'cleaners', 'services'],
  procurement: ['مشتريات', 'المشتريات', 'تجهيز', 'مخازن', 'procurement', 'purchasing'],
  facilities: ['تسهيلات', 'التسهيلات', 'خدمات ادارية', 'facilities'],
  hr: ['الموارد البشرية', 'موارد بشرية', 'شؤون الموظفين', 'hr', 'human resources', 'personnel'],
  finance: ['المالية', 'مالية', 'حسابات', 'الحسابات', 'محاسب', 'مالي', 'finance', 'financial', 'accounting', 'accountant'],
  it: ['تكنولوجيا المعلومات', 'تقنية المعلومات', 'حاسبة', 'نظم', 'برمجة', 'دعم فني', 'it', 'tech', 'software', 'systems', 'information technology'],
  audit: ['تدقيق', 'التدقيق', 'رقابة', 'audit', 'auditor', 'internal audit'],
  compliance: ['امتثال', 'الامتثال', 'compliance'],
  risk: ['مخاطر', 'المخاطر', 'risk'],
  legal: ['قانونية', 'القانونية', 'حقوقي', 'محامي', 'legal', 'lawyer'],
  operations: ['عمليات', 'العمليات', 'تشغيل', 'operations', 'ops'],
  customer_service: ['خدمة العملاء', 'خدمة الزبائن', 'استقبال', 'customer service', 'reception'],
  guard_security: ['حارس', 'حراسة', 'امن', 'أمن', 'security', 'guard']
};

/**
 * Generates all expanded synonym keywords for a given text snippet (branch, title, dept)
 */
function getSynonymKeywords(text: string): string[] {
  if (!text) return [];
  const normalized = normalizeArabicText(text) + ' ' + normalizeEnglishText(text);
  const keywords: string[] = [];

  for (const group of Object.values(BRANCH_SYNONYMS)) {
    const matchesGroup = group.some(term => {
      const normTerm = normalizeArabicText(term) || normalizeEnglishText(term);
      return normalized.includes(normTerm);
    });
    if (matchesGroup) {
      keywords.push(...group);
    }
  }

  for (const group of Object.values(TITLE_DEPT_SYNONYMS)) {
    const matchesGroup = group.some(term => {
      const normTerm = normalizeArabicText(term) || normalizeEnglishText(term);
      return normalized.includes(normTerm);
    });
    if (matchesGroup) {
      keywords.push(...group);
    }
  }

  return keywords;
}

/**
 * Determines whether a single token matches an employee's normalized data bags
 */
function matchSingleToken(
  token: string,
  arabicBag: string,
  englishBag: string,
  idBag: string[],
  cleanDigitsBag: string[]
): boolean {
  if (!token) return true;

  // 1. Direct check in numeric / ID bags
  const cleanTokenDigits = token.replace(/\D/g, '');
  if (cleanTokenDigits && cleanDigitsBag.some(idDigits => idDigits.includes(cleanTokenDigits))) {
    return true;
  }
  const cleanTokenId = token.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (cleanTokenId && idBag.some(id => id.includes(cleanTokenId))) {
    return true;
  }

  // 2. Arabic query matching
  if (hasArabicCharacters(token)) {
    const normArabic = normalizeArabicText(token);
    if (!normArabic) return true;

    // Direct match against Arabic text bag
    if (arabicBag.includes(normArabic)) {
      return true;
    }

    // Match without leading "ال" (e.g. searching "بياتي" for "البياتي", or "كوت" for "الكوت")
    if (normArabic.startsWith('ال') && normArabic.length > 3) {
      const withoutAl = normArabic.substring(2);
      if (arabicBag.includes(withoutAl)) {
        return true;
      }
    } else {
      // Query lacks "ال", but bag might have "ال" + query (already covered by includes)
      const withAl = 'ال' + normArabic;
      if (arabicBag.includes(withAl)) {
        return true;
      }
    }

    return false;
  }

  // 3. English / Latin query matching
  const normEnglish = normalizeEnglishText(token);
  if (!normEnglish) return true;

  if (englishBag.includes(normEnglish)) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether an employee record matches a user query in Arabic or English
 */
export function employeeMatchesBilingualQuery(e: any, query: string): boolean {
  if (!query || !query.trim()) return true;
  if (!e) return false;

  // Split query into individual tokens (space-separated)
  const tokens = query.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  // 1. Build the Arabic searchable text bag
  const arabicSources = [
    e.fullName,
    e.fullNameAr,
    e.full_name_ar,
    e.branch,
    e.location_ar,
    e.jobTitle,
    e.position_ar,
    e.department,
    e.position
  ].filter(Boolean);

  // If employee has English name, generate phonetic Arabic transliteration
  const englishName = e.fullNameEn || e.full_name_en || (!hasArabicCharacters(e.fullName) ? e.fullName : '');
  if (englishName) {
    const transliteratedAr = transliterateEnglishNameToArabic(englishName);
    if (transliteratedAr) {
      arabicSources.push(transliteratedAr);
    }
  }

  // Add synonym keywords (Arabic) for branch / jobTitle / dept
  const branchSynonyms = getSynonymKeywords(`${e.branch || ''} ${e.branchEn || ''} ${e.location_ar || ''} ${e.location_en || ''}`);
  const titleSynonyms = getSynonymKeywords(`${e.jobTitle || ''} ${e.jobTitleEn || ''} ${e.position_ar || ''} ${e.position_en || ''} ${e.department || ''}`);
  arabicSources.push(...branchSynonyms, ...titleSynonyms);

  const arabicBag = normalizeArabicText(arabicSources.join(' '));

  // 2. Build the English searchable text bag
  const englishSources = [
    e.fullNameEn,
    e.full_name_en,
    !hasArabicCharacters(e.fullName) ? e.fullName : '',
    e.branchEn,
    e.location_en,
    e.jobTitleEn,
    e.position_en,
    e.departmentEn,
    e.email,
    e.personalEmail,
    e.phone,
    e.mobile
  ].filter(Boolean);

  // Also include the English synonyms
  englishSources.push(...branchSynonyms, ...titleSynonyms);

  const englishBag = normalizeEnglishText(englishSources.join(' '));

  // 3. Build IDs and Badge bags
  const rawIds = [
    String(e.employeeId || ''),
    String(e.employee_id || ''),
    String(e.badgeNo || ''),
    String(e.badge_no || ''),
    String(e.id || '')
  ].filter(Boolean);

  const idBag = rawIds.map(id => id.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const cleanDigitsBag = rawIds.map(id => id.replace(/\D/g, '')).filter(Boolean);

  // 4. Every token must match at least one attribute
  return tokens.every(token =>
    matchSingleToken(token, arabicBag, englishBag, idBag, cleanDigitsBag)
  );
}

/**
 * Filter an array of employee records bilingually
 */
export function filterEmployeesBilingual<T = any>(employees: T[], query: string): T[] {
  if (!query || !query.trim()) return employees;
  return employees.filter(emp => employeeMatchesBilingualQuery(emp, query));
}
