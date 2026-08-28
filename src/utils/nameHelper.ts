/**
 * Name localization & transliteration utility for HRMS Candidates and Employees
 */

// Comprehensive Arabic <-> English Name Mapping Dictionary
const NAME_MAP_EN_TO_AR: Record<string, string> = {
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
  'zeyad': 'زياد'
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

  // Split by words/whitespace
  const words = name.trim().split(/\s+/);
  const arabicWords = words.map(word => {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) return word;

    // Check exact dictionary match
    if (NAME_MAP_EN_TO_AR[cleanWord]) {
      return NAME_MAP_EN_TO_AR[cleanWord];
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
