/**
 * Name localization & transliteration utility for HRMS Candidates and Employees
 */

export const NAME_MAP_EN_TO_AR: Record<string, string> = {
  // First & Common Names
  'mustafa': 'مصطفى',
  'moustafa': 'مصطفى',
  'mostafa': 'مصطفى',
  'meer': 'مير',
  'mir': 'مير',
  'ali': 'علي',
  'aly': 'علي',
  'majeed': 'مجيد',
  'majid': 'مجيد',
  'ahmed': 'أحمد',
  'ahmad': 'أحمد',
  'mohammed': 'محمد',
  'mohamed': 'محمد',
  'muhammad': 'محمد',
  'mohammad': 'محمد',
  'mahmoud': 'محمود',
  'mahmood': 'محمود',
  'hassan': 'حسن',
  'hasan': 'حسن',
  'hussein': 'حسين',
  'hussain': 'حسين',
  'husein': 'حسين',
  'omar': 'عمر',
  'umar': 'عمر',
  'othman': 'عثمان',
  'uthman': 'عثمان',
  'osman': 'عثمان',
  'abu': 'أبو',
  'abou': 'أبو',
  'abd': 'عبد',
  'abdul': 'عبد الـ',
  'abdel': 'عبد الـ',
  'abdullah': 'عبد الله',
  'abdallah': 'عبد الله',
  'abdulrahman': 'عبد الرحمن',
  'abdelrahman': 'عبد الرحمن',
  'abdulkarim': 'عبد الكريم',
  'abdelkarim': 'عبد الكريم',
  'abdulaziz': 'عبد العزيز',
  'abdelaziz': 'عبد العزيز',
  'abdullatif': 'عبد اللطيف',
  'abdulwahab': 'عبد الوهاب',
  'khalid': 'خالد',
  'khaled': 'خالد',
  'khalil': 'خليل',
  'tariq': 'طارق',
  'tareq': 'طارق',
  'tarik': 'طارق',
  'saad': 'سعد',
  'saed': 'سعيد',
  'saeed': 'سعيد',
  'saif': 'سيف',
  'sayif': 'سيف',
  'salam': 'سلام',
  'salim': 'سالم',
  'salman': 'سلمان',
  'sulaiman': 'سليمان',
  'suleiman': 'سليمان',
  'solomon': 'سليمان',
  'yousif': 'يوسف',
  'yousef': 'يوسف',
  'yusuf': 'يوسف',
  'joseph': 'يوسف',
  'ibrahim': 'إبراهيم',
  'abraham': 'إبراهيم',
  'ismail': 'إسماعيل',
  'ishmael': 'إسماعيل',
  'ishaq': 'إسحاق',
  'isaac': 'إسحاق',
  'yaqoob': 'يعقوب',
  'jacob': 'يعقوب',
  'zaid': 'زيد',
  'zayd': 'زيد',
  'zain': 'زين',
  'zayn': 'زين',
  'noor': 'نور',
  'nour': 'نور',
  'sara': 'سارة',
  'sarah': 'سارة',
  'fatima': 'فاطمة',
  'fatimah': 'فاطمة',
  'maryam': 'مريم',
  'mariam': 'مريم',
  'zainab': 'زينب',
  'zaynab': 'زينب',
  'aya': 'آية',
  'ayah': 'آية',
  'zahra': 'زهراء',
  'zahraa': 'زهراء',
  'ban': 'بان',
  'baneen': 'بنين',
  'reem': 'ريم',
  'rim': 'ريم',
  'rasha': 'رشا',
  'rana': 'رنا',
  'huda': 'هدى',
  'houda': 'هدى',
  'maha': 'مها',
  'dina': 'دينا',
  'deena': 'دينا',
  'layla': 'ليلى',
  'leila': 'ليلى',
  'laila': 'ليلى',
  'rania': 'رانيا',
  'shimaa': 'شيماء',
  'shaymaa': 'شيماء',
  'shahed': 'شهد',
  'marwa': 'مروة',
  'doaa': 'دعاء',
  'duaa': 'دعاء',
  'jasim': 'جاسم',
  'jassim': 'جاسم',
  'jassem': 'جاسم',
  'gasim': 'جاسم',
  'kadhim': 'كاظم',
  'kadhem': 'كاظم',
  'kazem': 'كاظم',
  'kazim': 'كاظم',
  'mahdi': 'مهدي',
  'mehdi': 'مهدي',
  'sajad': 'سجاد',
  'sajjad': 'سجاد',
  'haidar': 'حيدر',
  'haider': 'حيدر',
  'hayder': 'حيدر',
  'haydar': 'حيدر',
  'ammar': 'عمار',
  'amar': 'عمار',
  'yasser': 'ياسر',
  'yasir': 'ياسر',
  'wameedh': 'وميض',
  'wameed': 'وميض',
  'bilal': 'بلال',
  'hamza': 'حمزة',
  'hamzah': 'حمزة',
  'walid': 'وليد',
  'waleed': 'وليد',
  'dhiya': 'ضياء',
  'diaa': 'ضياء',
  'dia': 'ضياء',
  'ghaith': 'غيث',
  'gaith': 'غيث',
  'raad': 'رعد',
  'raed': 'رائد',
  'bassam': 'بسام',
  'bassem': 'باسم',
  'basim': 'باسم',
  'thamer': 'ثامر',
  'thamir': 'ثامر',
  'luay': 'لؤي',
  'luaay': 'لؤي',
  'falah': 'فلاح',
  'nabeel': 'نبيل',
  'nabil': 'نبيل',
  'murtadha': 'مرتضى',
  'murtada': 'مرتضى',
  'abbas': 'عباس',
  'adel': 'عادل',
  'adil': 'عادل',
  'karim': 'كريم',
  'kareem': 'كريم',
  'samir': 'سمير',
  'sameer': 'سمير',
  'samira': 'سميرة',
  'sameera': 'سميرة',
  'salwa': 'سلوى',
  'mona': 'منى',
  'muna': 'منى',
  'amal': 'أمل',
  'iman': 'إيمان',
  'eman': 'إيمان',
  'amira': 'أميرة',
  'ameera': 'أميرة',
  'nasser': 'ناصر',
  'nasir': 'ناصر',
  'mansour': 'منصور',
  'mansoor': 'منصور',
  'munir': 'منير',
  'muneer': 'منير',
  'anwar': 'أنور',
  'akram': 'أكرم',
  'ashraf': 'أشرف',
  'ayman': 'أيمن',
  'amjad': 'أمجد',
  'arshad': 'أرشد',
  'asad': 'أسعد',
  'asaad': 'أسعد',
  'bahaa': 'بهاء',
  'baha': 'بهاء',
  'firas': 'فراس',
  'farris': 'فارس',
  'faris': 'فارس',
  'ghassan': 'غسان',
  'habib': 'حبيب',
  'habeeb': 'حبيب',
  'hadi': 'هادي',
  'hakim': 'حكيم',
  'hakeem': 'حكيم',
  'hatem': 'حاتم',
  'hazem': 'حازم',
  'hesham': 'هشام',
  'hisham': 'هشام',
  'jamal': 'جمال',
  'kamal': 'كمال',
  'laith': 'ليث',
  'layth': 'ليث',
  'mazin': 'مازن',
  'mazen': 'مازن',
  'mohannad': 'مهند',
  'muhannad': 'مهند',
  'naji': 'ناجي',
  'najat': 'نجاة',
  'qusay': 'قصي',
  'qasim': 'قاسم',
  'qassim': 'قاسم',
  'rami': 'رامي',
  'riad': 'رياض',
  'riyadh': 'رياض',
  'sarmad': 'سرمد',
  'sinan': 'سنان',
  'taha': 'طه',
  'taher': 'طاهر',
  'tahir': 'طاهر',
  'wathiq': 'واثق',
  'wesam': 'وسام',
  'wissam': 'وسام',
  'yahya': 'يحيى',
  'ziad': 'زياد',
  'zeyad': 'زياد',
  // Additional Iraqi / Regional Names & Surnames
  'al': 'ال',
  'el': 'ال',
  'bayati': 'بياتي',
  'albayati': 'البياتي',
  'bayadli': 'بيادلي',
  'albayadli': 'البيدلي',
  'toma': 'توما',
  'thomas': 'توما',
  'hamoud': 'حمود',
  'hamood': 'حمود',
  'khanjar': 'خنجر',
  'musa': 'موسى',
  'mousa': 'موسى',
  'moosa': 'موسى',
  'jalal': 'جلال',
  'shler': 'شلر',
  'shleer': 'شلير',
  'nazem': 'ناظم',
  'nadhim': 'ناظم',
  'hashem': 'هاشم',
  'hashim': 'هاشم',
  'rahim': 'رحيم',
  'raheem': 'رحيم',
  'sadoun': 'سعدون',
  'saadoun': 'سعدون',
  'jalawi': 'جلاوي',
  'nazif': 'نظيف',
  'nadheef': 'نظيف',
  'sadia': 'سعدية',
  'saadia': 'سعدية',
  'munshed': 'منشد',
  'kazzar': 'كزار',
  'rawad': 'رواد',
  'dakhel': 'داخل',
  'dakhil': 'داخل',
  'abdalmhdy': 'عبد المهدي',
  'abdelmahdi': 'عبد المهدي',
  'abdalmahdi': 'عبد المهدي',
  'radiya': 'راضية',
  'radhiya': 'راضية',
  'muhaisen': 'محيسن',
  'muhsen': 'محسن',
  'osama': 'أسامة',
  'ousama': 'أسامة',
  'usama': 'أسامة',
  'najm': 'نجم',
  'najim': 'نجم',
  'akar': 'اكار',
  'nema': 'نعمة',
  'nimah': 'نعمة',
  'neamah': 'نعمة',
  'muhi': 'محي',
  'azzawi': 'عزاوي',
  'alazzawi': 'العزاوي',
  'askar': 'عسكر',
  'jlyl': 'جليل',
  'aljlyl': 'عبد الجليل',
  'jawad': 'جواد',
  'yasiri': 'ياسري',
  'alyasiri': 'الياسري',
  'ayat': 'آيات',
  'saleh': 'صالح',
  'salih': 'صالح',
  'shakir': 'شاكر',
  'shaker': 'شاكر',
  'dirgham': 'ضرغام',
  'abdalrda': 'عبد الرضا',
  'fawzia': 'فوزية',
  'fawziya': 'فوزية',
  'ayal': 'عيال',
  'ferial': 'فريال',
  'firial': 'فريال',
  'dawood': 'داود',
  'dawud': 'داود',
  'isho': 'ايشو',
  'ishoo': 'ايشو'
};

const PHONETIC_LETTER_MAP: Record<string, string> = {
  'sh': 'ش',
  'th': 'ث',
  'kh': 'خ',
  'dh': 'ذ',
  'gh': 'غ',
  'ch': 'تش',
  'ph': 'ف',
  'a': 'ا',
  'b': 'ب',
  'c': 'ك',
  'd': 'د',
  'e': 'ي',
  'f': 'ف',
  'g': 'ج',
  'h': 'هـ',
  'i': 'ي',
  'j': 'ج',
  'k': 'ك',
  'l': 'ل',
  'm': 'م',
  'n': 'ن',
  'o': 'و',
  'p': 'ب',
  'q': 'ق',
  'r': 'ر',
  's': 'س',
  't': 'ت',
  'u': 'و',
  'v': 'ف',
  'w': 'و',
  'x': 'كس',
  'y': 'ي',
  'z': 'ز'
};

/**
 * Checks if a string contains Arabic characters
 */
export function hasArabicCharacters(text: string): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

/**
 * Translates/transliterates an English name to Arabic
 */
export function transliterateEnglishNameToArabic(name: string): string {
  if (!name || !name.trim()) return '';
  if (hasArabicCharacters(name)) return name.trim();

  // Split by words, whitespace, or hyphens
  const words = name.trim().replace(/[-_]/g, ' ').split(/\s+/);
  const arabicWords = words.map(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return word;

    // Direct match
    if (NAME_MAP_EN_TO_AR[cleanWord]) {
      return NAME_MAP_EN_TO_AR[cleanWord];
    }

    // Check if starts with 'al' or 'el'
    if (cleanWord.startsWith('al') && cleanWord.length > 3) {
      const rest = cleanWord.substring(2);
      if (NAME_MAP_EN_TO_AR[rest]) {
        return 'ال' + NAME_MAP_EN_TO_AR[rest];
      }
    }
    if (cleanWord.startsWith('el') && cleanWord.length > 3) {
      const rest = cleanWord.substring(2);
      if (NAME_MAP_EN_TO_AR[rest]) {
        return 'ال' + NAME_MAP_EN_TO_AR[rest];
      }
    }

    // Phonetic fallback
    let result = '';
    let i = 0;
    while (i < cleanWord.length) {
      if (i + 1 < cleanWord.length) {
        const pair = cleanWord.substring(i, i + 2);
        if (PHONETIC_LETTER_MAP[pair]) {
          result += PHONETIC_LETTER_MAP[pair];
          i += 2;
          continue;
        }
      }
      const single = cleanWord[i];
      result += PHONETIC_LETTER_MAP[single] || single;
      i++;
    }

    return result;
  });

  return arabicWords.join(' ');
}

/**
 * Universal candidate display name resolver based on active language
 */
export function getCandidateDisplayName(
  candidate: { fullName?: string; fullNameAr?: string; fullNameEn?: string } | string | null | undefined,
  language: string = 'ar'
): string {
  if (!candidate) return '';

  let name = typeof candidate === 'string' ? candidate : (candidate.fullName || '');
  let nameAr = typeof candidate === 'object' && candidate ? candidate.fullNameAr : undefined;
  let nameEn = typeof candidate === 'object' && candidate ? candidate.fullNameEn : undefined;

  if (language === 'ar') {
    // In Arabic mode, prioritize Arabic full name
    if (nameAr && nameAr.trim() && hasArabicCharacters(nameAr)) {
      return nameAr.trim();
    }
    if (name && hasArabicCharacters(name)) {
      return name.trim();
    }
    // If name is in English, translate to Arabic
    if (name && name.trim()) {
      return transliterateEnglishNameToArabic(name);
    }
    return 'مرشح متقدم';
  } else {
    // In English mode
    if (nameEn && nameEn.trim()) {
      return nameEn.trim();
    }
    if (name && !hasArabicCharacters(name)) {
      return name.trim();
    }
    // Fallback to name or nameAr
    return name || nameAr || 'Candidate';
  }
}

/**
 * Common Iraqi full names dictionary mapping Arabic to English
 */
export const ARABIC_NAMES_DICT: Record<string, string> = {
  'وليد خالد اسماعيل البياتي': 'Walid Khalid Ismail Al-Bayati',
  'وليد خالد إسماعيل البياتي': 'Walid Khalid Ismail Al-Bayati',
  'طعمه حمود خنجر البهادلي': 'Taama Hamoud Khanjar Al-Bahadli',
  'طعمة حمود خنجر البهادلي': 'Taama Hamoud Khanjar Al-Bahadli',
  'طه ماجد موسى': 'Taha Majid Musa',
  'ايمان يعرب عبدالجليل': 'Iman Yaarab Abdul-Jaleel',
  'إيمان يعرب عبدالجليل': 'Iman Yaarab Abdul-Jaleel',
  'إيمان يعرب عبد الجليل': 'Iman Yaarab Abdul-Jaleel',
  'ايمان يعرب عبد الجليل': 'Iman Yaarab Abdul-Jaleel',
  'عمار عسكر عبد الجليل': 'Ammar Askar Abdul-Jaleel',
  'عمار عسكر عبدالجليل': 'Ammar Askar Abdul-Jaleel',
  'عمار جواد حسن الياسري': 'Ammar Jawad Hassan Al-Yasiri',
  'مصطفى المير': 'Mustafa Al-Meer',
  'علي حسن محي العراوي': 'Ali Hassan Muhi Al-Arawi',
  'آيات موسى صالح': 'Ayat Musa Saleh',
  'بلال كاظم شاكر': 'Bilal Kadhim Shaker',
  'ضرغام عبدالرضا محمد': 'Dhirgham Abdul-Redha Mohammad',
  'فوزية كاظم عيال': 'Fawziya Kadhim Ayal',
  'أدمن نظام الموارد البشرية': 'HR System Admin',
  'ادمن نظام الموارد البشرية': 'HR System Admin',
};

/**
 * Word-level Arabic to English mapping
 */
export const AR_TO_EN_WORD_MAP: Record<string, string> = {
  'وليد': 'Walid',
  'خالد': 'Khalid',
  'اسماعيل': 'Ismail',
  'إسماعيل': 'Ismail',
  'البياتي': 'Al-Bayati',
  'بياتي': 'Bayati',
  'طعمه': 'Taama',
  'طعمة': 'Taama',
  'حمود': 'Hamoud',
  'خنجر': 'Khanjar',
  'البهادلي': 'Al-Bahadli',
  'بهادلي': 'Bahadli',
  'طه': 'Taha',
  'ماجد': 'Majid',
  'موسى': 'Musa',
  'ايمان': 'Iman',
  'إيمان': 'Iman',
  'يعرب': 'Yaarab',
  'عبدالجليل': 'Abdul-Jaleel',
  'عبد الجليل': 'Abdul-Jaleel',
  'عمار': 'Ammar',
  'عسكر': 'Askar',
  'جواد': 'Jawad',
  'حسن': 'Hassan',
  'الياسري': 'Al-Yasiri',
  'ياسري': 'Yasiri',
  'مصطفى': 'Mustafa',
  'المير': 'Al-Meer',
  'مير': 'Meer',
  'علي': 'Ali',
  'محي': 'Muhi',
  'العراوي': 'Al-Arawi',
  'عراوي': 'Arawi',
  'محمد': 'Mohammed',
  'احمد': 'Ahmed',
  'أحمد': 'Ahmed',
  'محمود': 'Mahmoud',
  'حسين': 'Hussein',
  'عمر': 'Omar',
  'عثمان': 'Othman',
  'عبد': 'Abd',
  'الله': 'Allah',
  'عبدالله': 'Abdullah',
  'عبد الله': 'Abdullah',
  'عبدالرحمن': 'Abdulrahman',
  'عبد الرحمن': 'Abdulrahman',
  'كريم': 'Karim',
  'عبدالكريم': 'Abdulkarim',
  'عبد الكريم': 'Abdulkarim',
  'سعد': 'Saad',
  'سعيد': 'Saeed',
  'سيف': 'Saif',
  'سلام': 'Salam',
  'سالم': 'Salim',
  'سلمان': 'Salman',
  'يوسف': 'Yousif',
  'إبراهيم': 'Ibrahim',
  'ابراهيم': 'Ibrahim',
  'زيد': 'Zaid',
  'زين': 'Zain',
  'نور': 'Noor',
  'سارة': 'Sara',
  'فاطمة': 'Fatima',
  'مريم': 'Maryam',
  'زينب': 'Zainab',
  'آية': 'Aya',
  'زهراء': 'Zahra',
  'جاسم': 'Jasim',
  'كاظم': 'Kadhim',
  'مهدي': 'Mahdi',
  'سجاد': 'Sajjad',
  'حيدر': 'Haidar',
  'ياسر': 'Yasser',
  'بلال': 'Bilal',
  'حمزة': 'Hamza',
  'ضياء': 'Dhiya',
  'غيث': 'Ghaith',
  'رائد': 'Raed',
  'باسم': 'Basim',
  'نبيل': 'Nabeel',
  'مرتضى': 'Murtadha',
  'عباس': 'Abbas',
  'عادل': 'Adel',
  'سمير': 'Samir',
  'ناصر': 'Nasser',
  'منصور': 'Mansour',
  'منير': 'Munir',
  'أنور': 'Anwar',
  'اكرم': 'Akram',
  'أكرم': 'Akram',
  'ايمن': 'Ayman',
  'أيمن': 'Ayman',
  'امجد': 'Amjad',
  'أمجد': 'Amjad',
  'صالح': 'Saleh',
  'شاكر': 'Shaker',
  'ضرغام': 'Dhirgham',
  'عبدالرضا': 'Abdul-Redha',
  'عبد الرضا': 'Abdul-Redha',
  'فوزية': 'Fawziya',
  'عيال': 'Ayal',
  'داود': 'Dawood',
};

/**
 * Translates/transliterates an Arabic name to English
 */
export function transliterateArabicNameToEnglish(arName: string): string {
  if (!arName || !arName.trim()) return '';
  const trimmed = arName.trim();
  if (ARABIC_NAMES_DICT[trimmed]) return ARABIC_NAMES_DICT[trimmed];
  if (trimmed.includes('أدمن') || trimmed.includes('ادمن') || trimmed.includes('نظام الموارد البشرية') || trimmed.includes('مدير النظام')) {
    return 'HR System Admin';
  }

  const words = trimmed.split(/\s+/);
  const enWords = words.map(w => {
    if (AR_TO_EN_WORD_MAP[w]) return AR_TO_EN_WORD_MAP[w];
    if (w.startsWith('ال') && AR_TO_EN_WORD_MAP[w.substring(2)]) {
      return 'Al-' + AR_TO_EN_WORD_MAP[w.substring(2)];
    }
    return w;
  });
  return enWords.join(' ');
}

/**
 * Universal employee display name resolver based on active language
 */
export function getEmployeeLocalizedName(emp: any, language: string = 'ar'): string {
  if (!emp) return '';
  if (typeof emp === 'string') {
    if (language === 'en') {
      if (!hasArabicCharacters(emp)) return emp;
      return transliterateArabicNameToEnglish(emp);
    }
    return emp;
  }

  const enName = emp.fullNameEn || emp.full_name_en || emp.name_en || emp.nameEn;
  const arName = emp.fullName || emp.fullNameAr || emp.full_name_ar || emp.name || emp.name_ar || '';

  if (language === 'en') {
    if (enName && enName.trim() && enName !== 'N/A' && !hasArabicCharacters(enName)) {
      return enName.trim();
    }
    if (arName && !hasArabicCharacters(arName)) {
      return arName.trim();
    }
    if (arName && arName.trim()) {
      return transliterateArabicNameToEnglish(arName);
    }
    return 'Employee';
  } else {
    if (arName && arName.trim() && hasArabicCharacters(arName)) {
      return arName.trim();
    }
    if (enName && hasArabicCharacters(enName)) {
      return enName.trim();
    }
    if (enName && enName.trim()) {
      return transliterateEnglishNameToArabic(enName);
    }
    return arName || 'موظف';
  }
}

/**
 * Department localization dictionary
 */
export const DEPARTMENTS_DICT: Record<string, { ar: string; en: string }> = {
  'المشتريات والتسهيلات': { ar: 'المشتريات والتسهيلات', en: 'Procurement & Facilities' },
  'قسم الائتمان': { ar: 'قسم الائتمان', en: 'Credit Department' },
  'الائتمان': { ar: 'قسم الائتمان', en: 'Credit Department' },
  'قسم الاتئمان': { ar: 'قسم الائتمان', en: 'Credit Department' },
  'الموارد البشرية': { ar: 'الموارد البشرية', en: 'Human Resources' },
  'قسم الموارد البشرية': { ar: 'قسم الموارد البشرية', en: 'Human Resources Department' },
  'المعلوماتية والاتصالات': { ar: 'المعلوماتية والاتصالات', en: 'IT & Communications' },
  'تكنولوجيا المعلومات': { ar: 'تكنولوجيا المعلومات', en: 'Information Technology' },
  'المالية والمحاسبة': { ar: 'المالية والمحاسبة', en: 'Finance & Accounting' },
  'القسم المالي': { ar: 'القسم المالي', en: 'Finance Department' },
  'المخاطر والامتثال': { ar: 'المخاطر والامتثال', en: 'Risk & Compliance' },
  'الأمن': { ar: 'الأمن', en: 'Security' },
  'قسم الأمن': { ar: 'قسم الأمن', en: 'Security Department' },
  'العمليات': { ar: 'العمليات', en: 'Operations' },
  'الشؤون القانونية': { ar: 'الشؤون القانونية', en: 'Legal Affairs' },
  'غير محدد': { ar: 'غير محدد', en: 'Unspecified' },
};

export function getLocalizedDepartment(dept: string | undefined | null, language: string = 'ar'): string {
  if (!dept || dept.trim() === '') return language === 'en' ? 'Unspecified' : 'غير محدد';
  const clean = dept.trim();
  if (DEPARTMENTS_DICT[clean]) {
    return language === 'en' ? DEPARTMENTS_DICT[clean].en : DEPARTMENTS_DICT[clean].ar;
  }
  return clean;
}

/**
 * Job title localization dictionary
 */
export const JOB_TITLES_DICT: Record<string, { ar: string; en: string }> = {
  'عمال نظافة': { ar: 'عمال نظافة', en: 'Cleaners' },
  'عامل نظافة': { ar: 'عامل نظافة', en: 'Cleaner' },
  'مسؤول قروض': { ar: 'مسؤول قروض', en: 'Loan Officer' },
  'مسؤول قروض محصل': { ar: 'مسؤول قروض محصل', en: 'Collector Loan Officer' },
  'مساعد ائتمان القروض الصغيره': { ar: 'مساعد ائتمان القروض الصغيرة', en: 'Microfinance Loan Assistant' },
  'مساعد ائتمان القروض الصغيرة': { ar: 'مساعد ائتمان القروض الصغيرة', en: 'Microfinance Loan Assistant' },
  'مدير مكتب': { ar: 'مدير مكتب', en: 'Office Manager' },
  'عامل صيانه وسائق': { ar: 'عامل صيانة وسائق', en: 'Maintenance & Driver' },
  'عامل صيانة وسائق': { ar: 'عامل صيانة وسائق', en: 'Maintenance & Driver' },
  'نائب منسق اقليمي': { ar: 'نائب منسق إقليمي', en: 'Regional Deputy Coordinator' },
  'نائب منسق إقليمي': { ar: 'نائب منسق إقليمي', en: 'Regional Deputy Coordinator' },
  'مدير الفرع': { ar: 'مدير الفرع', en: 'Branch Manager' },
  'مدير فرع': { ar: 'مدير فرع', en: 'Branch Manager' },
  'مدير الموارد البشرية': { ar: 'مدير الموارد البشرية', en: 'HR Manager' },
  'محاسب رئيسي': { ar: 'محاسب رئيسي', en: 'Chief Accountant' },
  'مسؤول تقنية المعلومات': { ar: 'مسؤول تقنية المعلومات', en: 'IT Officer' },
  'مسؤول الامتثال والمخاطر': { ar: 'مسؤول الامتثال والمخاطر', en: 'Risk & Compliance Officer' },
  'غير محدد': { ar: 'غير محدد', en: 'Unspecified' },
};

export function getLocalizedJobTitle(title: string | undefined | null, language: string = 'ar'): string {
  if (!title || title.trim() === '') return language === 'en' ? 'Unspecified' : 'غير محدد';
  const clean = title.trim();
  if (JOB_TITLES_DICT[clean]) {
    return language === 'en' ? JOB_TITLES_DICT[clean].en : JOB_TITLES_DICT[clean].ar;
  }
  return clean;
}

/**
 * Notification title localization
 */
export function localizeNotificationTitle(title: string, language: string = 'ar'): string {
  if (!title) return '';
  if (language === 'ar') return title;

  const tMap: Record<string, string> = {
    'تعديل بيانات موظف': 'Employee Record Updated',
    'إضافة موظف جديد': 'New Employee Added',
    'طلب إجازة جديد': 'New Leave Request',
    'تنبيه إيقاف الرواتب (On Hold)': 'Salary On-Hold Alert',
    'تحديث مسير رواتب الشهر الحالي': 'Payroll Updated for Current Month',
    'نظام إدارة الإجازات والغيابات': 'Leave & Attendance Management',
    'تكامل قاعدة البيانات XAMPP MySQL': 'MySQL Database Integration',
    'رمز التحقق OTP': 'OTP Verification Code',
    'تم تسجيل الدخول بنجاح': 'Login Successful',
    'إنهاء الجلسة': 'Session Terminated',
    'إنهاء الجلسات': 'Sessions Terminated',
    'اختبار SSO بنجاح': 'SSO Test Passed',
    'مطابقة البصمة الحيوية': 'Biometric Match Success',
    'تم حفظ تقييمات اللجنة': 'Committee Evaluations Saved',
    'تم رفض المرشح وإرسال الإشعار': 'Candidate Rejected & Notified',
    'تم قبول المرشح للفرز': 'Candidate Accepted for Screening',
    'تم إلغاء التعيين وحذف الموظف': 'Hiring Cancelled & Staff Removed',
    'تم جدولة المقابلة الابتدائية': 'Initial Interview Scheduled',
    'تم جدولة المقابلة النهائية': 'Final Interview Scheduled',
    'تم الاتصال بقاعدة بيانات MySQL بنجاح': 'Database Connected Successfully',
    'فشل الاتصال بقاعدة البيانات': 'Database Connection Failed',
    'مركز التنبيهات': 'Notification Center',
    'تنبيه النظام': 'System Alert',
    'إشعار إداري': 'Admin Notification',
    'التنبيهات والأحداث المباشرة': 'Live Notifications & Activity'
  };
  return tMap[title.trim()] || title;
}

/**
 * Notification message localization
 */
export function localizeNotificationMessage(message: string, language: string = 'ar'): string {
  if (!message) return '';
  if (language === 'ar') return message;

  // Pattern 1: تم تحديث بيانات الموظف [اسم] بنجاح
  const updateMatch = message.match(/تم(?:ت)?\s+تحديث بيانات الموظف\s+(.+?)(?:\s+بنجاح)?$/);
  if (updateMatch) {
    const rawName = updateMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Employee record for ${enName} was updated successfully.`;
  }

  // Pattern 2: تمت إضافة الموظف [اسم] بنجاح إلى السجلات
  const addMatch = message.match(/تمت إضافة الموظف\s+(.+?)(?:\s+بنجاح)?(?:\s+إلى\s+.+)?$/);
  if (addMatch) {
    const rawName = addMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Employee ${enName} was added successfully to records.`;
  }

  // Pattern 3: تم تقديم طلب إجازة بواسطة [اسم]
  const leaveMatch = message.match(/تم تقديم طلب إجازة بواسطة\s+(.+)/);
  if (leaveMatch) {
    const rawName = leaveMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Leave request submitted by ${enName}.`;
  }

  // Pattern 4: تم حفظ تقييمات لجنة التعيين للمرشح [اسم] بمعدل ([س]/100)
  const evalMatch = message.match(/تم حفظ تقييمات لجنة التعيين للمرشح\s+(.+?)\s+بمعدل\s+\((.+?)\)/);
  if (evalMatch) {
    const rawName = evalMatch[1];
    const score = evalMatch[2];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Committee evaluation saved for ${enName} with score (${score}).`;
  }

  // Pattern 5: تم رفض المرشح [اسم] وإرسال إشعار لعدم توفر متطلبات العمل
  const rejMatch = message.match(/تم رفض المرشح\s+(.+?)\s+وإرسال إشعار/);
  if (rejMatch) {
    const rawName = rejMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Candidate ${enName} was rejected and notified.`;
  }

  // Pattern 6: تم قبول المرشح [اسم] لمرحلة فرز المتقدمين
  const accMatch = message.match(/تم قبول المرشح\s+(.+?)\s+لمرحلة/);
  if (accMatch) {
    const rawName = accMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Candidate ${enName} was accepted for screening stage.`;
  }

  // Pattern 7: تم جدولة مقابلة ابتدائية للمرشح [اسم]
  const int1Match = message.match(/تم جدولة مقابلة ابتدائية للمرشح\s+(.+)/);
  if (int1Match) {
    const rawName = int1Match[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Initial interview scheduled for ${enName}.`;
  }

  // Pattern 8: تم جدولة مقابلة نهائية للمرشح [اسم]
  const int2Match = message.match(/تم جدولة مقابلة نهائية للمرشح\s+(.+)/);
  if (int2Match) {
    const rawName = int2Match[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Final interview scheduled for ${enName}.`;
  }

  // Pattern 9: تم إلغاء تعيين [اسم] وحذف بياناته
  const cancelMatch = message.match(/تم إلغاء تعيين\s+(.+?)\s+وحذف بياناته/);
  if (cancelMatch) {
    const rawName = cancelMatch[1];
    const enName = transliterateArabicNameToEnglish(rawName);
    return `Hiring cancelled for ${enName} and removed from directory.`;
  }

  // Pattern 10: Auth & Session notifications
  if (message.includes('تم التوجيه بنجاح بصلاحية')) {
    const rolePart = message.replace('تم التوجيه بنجاح بصلاحية', '').trim();
    return `Successfully routed with role ${rolePart}.`;
  }
  if (message.includes('تم إنهاء الجلسة')) {
    return message.replace('تم إنهاء الجلسة', 'Session')
      .replace('وإلغاء صلاحيتها بنجاح', 'was successfully terminated.');
  }
  if (message.includes('تم إرسال رمز الأمان')) {
    return 'Verification security code sent to your registered phone.';
  }
  if (message.includes('تمت مصادقة نطاق')) {
    return 'Domain vitasiraq.com authenticated via Azure AD.';
  }
  if (message.includes('تم التأكد من هويتك بنسبة')) {
    return 'Identity verified with 99.8% biometric confidence.';
  }

  if (message.includes('نظام حوكمة وإيقاف الرواتب مفعل تلقائياً')) {
    return 'Governance & payroll hold system is active for resigned or on-hold employees.';
  }
  if (message.includes('مسير الرواتب الحاضر نشط ومحدث')) {
    const countMatch = message.match(/لـ\s*(\d+)\s*موظف/);
    const count = countMatch ? countMatch[1] : '49';
    return `Current payroll is active and updated for ${count} staff across VITAS Iraq branches.`;
  }
  if (message.includes('تم ربط رصيد الإجازات السنوية والمرضية')) {
    return 'Annual and sick leave balances linked with automatic deductions calculated per labor law.';
  }
  if (message.includes('تم التثبت من الربط المباشر مع قاعدة البيانات')) {
    return 'Direct connection with local database vitasiraq_hris_db verified successfully.';
  }
  if (message.includes('تم الاتصال بقاعدة بيانات MySQL بنجاح')) {
    return 'Successfully connected to MySQL database.';
  }
  if (message.includes('فشل الاتصال بقاعدة بيانات MySQL')) {
    return 'Failed to connect to MySQL database. Using LocalStorage fallback.';
  }

  return message;
}

/**
 * Timestamp localization (e.g., 08:03 م -> 08:03 PM)
 */
export function localizeTimestamp(timestamp: string, language: string = 'ar'): string {
  if (!timestamp) return '';
  if (language === 'ar') return timestamp;

  let s = timestamp;
  s = s.replace(/م/g, 'PM').replace(/ص/g, 'AM');
  s = s.replace('الآن', 'Just now');
  s = s.replace('قبل 10 دقائق', '10 mins ago');
  s = s.replace('قبل دقيقة', '1 min ago');
  s = s.replace('قبل دقيقتين', '2 mins ago');
  s = s.replace('قبل دقائق', 'A few mins ago');
  s = s.replace('قبل ساعة', '1 hour ago');
  s = s.replace('منذ 10 دقائق', '10 mins ago');
  s = s.replace('منذ 12 دقيقة', '12 mins ago');
  s = s.replace('منذ دقيقة', '1 min ago');
  s = s.replace('اليوم', 'Today');
  s = s.replace('أمس', 'Yesterday');

  // Convert Arabic-Indic numerals
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  arDigits.forEach((d, i) => {
    s = s.split(d).join(String(i));
  });

  return s;
}
