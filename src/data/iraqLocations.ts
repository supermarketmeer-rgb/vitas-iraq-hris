// Comprehensive Iraq Governorates & Districts (18 Governorates + Major Districts)
// Used for Office (Branch) Governorate/District fields and Employee Work Location ComboBox

export interface IraqDistrict {
  ar: string;
  en: string;
}

export interface IraqGovernorate {
  ar: string;
  en: string;
  districts: IraqDistrict[];
}

export const IRAQ_GOVERNORATES: IraqGovernorate[] = [
  {
    ar: 'بغداد',
    en: 'Baghdad',
    districts: [
      { ar: 'الرصافة', en: 'Al-Rusafa' },
      { ar: 'الكرخ', en: 'Al-Karkh' },
      { ar: 'الكرادة', en: 'Karrada' },
      { ar: 'المنصور', en: 'Al-Mansour' },
      { ar: 'الأعظمية', en: 'Al-Adhamiya' },
      { ar: 'الكاظمية', en: 'Al-Kadhimiya' },
      { ar: 'مدينة الصدر', en: 'Sadr City' },
      { ar: 'المحمودية', en: 'Al-Mahmudiyah' },
      { ar: 'أبو غريب', en: 'Abu Ghraib' },
      { ar: 'المدائن', en: 'Al-Mada\'in' },
      { ar: 'الطارمية', en: 'Al-Tarmiyah' },
      { ar: 'التاجي', en: 'Al-Taji' },
      { ar: 'الزعفرانية', en: 'Al-Zafaraniya' },
      { ar: 'بغداد الجديدة', en: 'New Baghdad' },
      { ar: 'الدورة', en: 'Al-Dora' }
    ]
  },
  {
    ar: 'بابل',
    en: 'Babil',
    districts: [
      { ar: 'الحلة', en: 'Al-Hillah' },
      { ar: 'المحاويل', en: 'Al-Mahawil' },
      { ar: 'المسيب', en: 'Al-Musayyib' },
      { ar: 'الهاشمية', en: 'Al-Hashimiyah' },
      { ar: 'القاسم', en: 'Al-Qasim' },
      { ar: 'الحمزة الغربي', en: 'Al-Hamza Al-Gharbi' },
      { ar: 'كوثى (جبلة)', en: 'Jibla' },
      { ar: 'الإسكندرية', en: 'Al-Iskandariyah' }
    ]
  },
  {
    ar: 'البصرة',
    en: 'Basra',
    districts: [
      { ar: 'مركز البصرة', en: 'Basra Center' },
      { ar: 'الزبير', en: 'Al-Zubair' },
      { ar: 'أبو الخصيب', en: 'Abu Al-Khaseeb' },
      { ar: 'القرنة', en: 'Al-Qurnah' },
      { ar: 'المدينة', en: 'Al-Midaina' },
      { ar: 'شط العرب', en: 'Shatt Al-Arab' },
      { ar: 'الفاو', en: 'Al-Faw' },
      { ar: 'الهارثة', en: 'Al-Hartha' },
      { ar: 'أم قصر', en: 'Umm Qasr' }
    ]
  },
  {
    ar: 'النجف',
    en: 'Najaf',
    districts: [
      { ar: 'مركز النجف', en: 'Najaf Center' },
      { ar: 'الكوفة', en: 'Al-Kufa' },
      { ar: 'المناذرة', en: 'Al-Manathera' },
      { ar: 'المشخاب', en: 'Al-Mishkhab' }
    ]
  },
  {
    ar: 'كربلاء',
    en: 'Karbala',
    districts: [
      { ar: 'مركز كربلاء', en: 'Karbala Center' },
      { ar: 'الهندية (طويريج)', en: 'Al-Hindiya' },
      { ar: 'عين التمر', en: 'Ain Al-Tamur' },
      { ar: 'الحر', en: 'Al-Hurr' }
    ]
  },
  {
    ar: 'ذي قار',
    en: 'Dhi Qar',
    districts: [
      { ar: 'الناصرية', en: 'Al-Nasiriyah' },
      { ar: 'الشطرة', en: 'Al-Shatrah' },
      { ar: 'الرفاعي', en: 'Al-Rifai' },
      { ar: 'سوق الشيوخ', en: 'Suq Al-Shuyukh' },
      { ar: 'الجبايش', en: 'Al-Chibayish' },
      { ar: 'الغراف', en: 'Al-Gharraf' },
      { ar: 'قلعة سكر', en: 'Qalat Sukkar' },
      { ar: 'البطحاء', en: 'Al-Batha' }
    ]
  },
  {
    ar: 'القادسية (الديوانية)',
    en: 'Al-Qadisiyah (Diwaniyah)',
    districts: [
      { ar: 'الديوانية', en: 'Al-Diwaniyah' },
      { ar: 'الشامية', en: 'Al-Shamiya' },
      { ar: 'عفك', en: 'Afak' },
      { ar: 'الحمزة', en: 'Al-Hamza' },
      { ar: 'غماس', en: 'Ghammas' },
      { ar: 'السنية', en: 'Al-Saniya' }
    ]
  },
  {
    ar: 'المثنى',
    en: 'Al-Muthanna',
    districts: [
      { ar: 'السماوة', en: 'Al-Samawah' },
      { ar: 'الرميثة', en: 'Al-Rumaitha' },
      { ar: 'الخضر', en: 'Al-Khidhir' },
      { ar: 'السلمان', en: 'Al-Salman' },
      { ar: 'الوركاء', en: 'Al-Warka' }
    ]
  },
  {
    ar: 'ميسان',
    en: 'Maysan',
    districts: [
      { ar: 'العمارة', en: 'Al-Amarah' },
      { ar: 'المجر الكبير', en: 'Al-Majar Al-Kabir' },
      { ar: 'علي الغربي', en: 'Ali Al-Gharbi' },
      { ar: 'قلعة صالح', en: 'Qalat Saleh' },
      { ar: 'الكحلاء', en: 'Al-Kahla' },
      { ar: 'الميمونة', en: 'Al-Maimouna' }
    ]
  },
  {
    ar: 'واسط',
    en: 'Wasit',
    districts: [
      { ar: 'الكوت', en: 'Al-Kut' },
      { ar: 'الصويرة', en: 'Al-Suwaira' },
      { ar: 'الحي', en: 'Al-Hai' },
      { ar: 'النعمانية', en: 'Al-Numaniyah' },
      { ar: 'العزيزية', en: 'Al-Aziziyah' },
      { ar: 'بدرة', en: 'Badra' }
    ]
  },
  {
    ar: 'الأنبار',
    en: 'Al-Anbar',
    districts: [
      { ar: 'الرمادي', en: 'Ramadi' },
      { ar: 'الفلوجة', en: 'Fallujah' },
      { ar: 'هيت', en: 'Hit' },
      { ar: 'حديثة', en: 'Haditha' },
      { ar: 'القائم', en: 'Al-Qaim' },
      { ar: 'عنة', en: 'Ana' },
      { ar: 'راوة', en: 'Rawa' },
      { ar: 'الرطبة', en: 'Al-Rutba' },
      { ar: 'الكرمة', en: 'Al-Karma' },
      { ar: 'الخالدية', en: 'Al-Khalidiya' }
    ]
  },
  {
    ar: 'ديالى',
    en: 'Diyala',
    districts: [
      { ar: 'بعقوبة', en: 'Baqubah' },
      { ar: 'المقدادية', en: 'Al-Muqdadiyah' },
      { ar: 'الخالص', en: 'Al-Khalis' },
      { ar: 'خانقين', en: 'Khanaqin' },
      { ar: 'بلدروز', en: 'Balad Ruz' },
      { ar: 'كفري', en: 'Kifri' }
    ]
  },
  {
    ar: 'صلاح الدين',
    en: 'Saladin',
    districts: [
      { ar: 'تكريت', en: 'Tikrit' },
      { ar: 'سامراء', en: 'Samarra' },
      { ar: 'بيجي', en: 'Baiji' },
      { ar: 'بلد', en: 'Balad' },
      { ar: 'الدجيل', en: 'Al-Dujail' },
      { ar: 'الدور', en: 'Al-Dour' },
      { ar: 'الشرقاط', en: 'Al-Shirqat' },
      { ar: 'طوزخورماتو', en: 'Tuz Khurmatu' }
    ]
  },
  {
    ar: 'نينوى',
    en: 'Nineveh',
    districts: [
      { ar: 'الموصل', en: 'Mosul' },
      { ar: 'تلعفر', en: 'Tal Afar' },
      { ar: 'الحمدانية', en: 'Al-Hamdaniya' },
      { ar: 'تلكيف', en: 'Tel Keppe' },
      { ar: 'سنجار', en: 'Sinjar' },
      { ar: 'الشيخان', en: 'Sheikhan' },
      { ar: 'مخمور', en: 'Makhmur' },
      { ar: 'الحضر', en: 'Al-Hatra' },
      { ar: 'البعاج', en: 'Al-Ba\'aj' }
    ]
  },
  {
    ar: 'كركوك',
    en: 'Kirkuk',
    districts: [
      { ar: 'مركز كركوك', en: 'Kirkuk Center' },
      { ar: 'الحويجة', en: 'Al-Hawija' },
      { ar: 'داقوق', en: 'Daquq' },
      { ar: 'الدبس', en: 'Dibis' }
    ]
  },
  {
    ar: 'أربيل',
    en: 'Erbil',
    districts: [
      { ar: 'مركز أربيل', en: 'Erbil Center' },
      { ar: 'سوران', en: 'Soran' },
      { ar: 'شقلاوة', en: 'Shaqlawa' },
      { ar: 'كويسنجق', en: 'Koysinjaq' },
      { ar: 'خبات', en: 'Khabat' },
      { ar: 'ميركسور', en: 'Mergasor' },
      { ar: 'جومان', en: 'Choman' }
    ]
  },
  {
    ar: 'السليمانية',
    en: 'Sulaymaniyah',
    districts: [
      { ar: 'مركز السليمانية', en: 'Sulaymaniyah Center' },
      { ar: 'جمجمال', en: 'Chamchamal' },
      { ar: 'كلار', en: 'Kalar' },
      { ar: 'رانيا', en: 'Ranya' },
      { ar: 'دوكان', en: 'Dukan' },
      { ar: 'بشدر', en: 'Pshdar' },
      { ar: 'حلبجة', en: 'Halabja' }
    ]
  },
  {
    ar: 'دهوك',
    en: 'Duhok',
    districts: [
      { ar: 'مركز دهوك', en: 'Duhok Center' },
      { ar: 'زاخو', en: 'Zakho' },
      { ar: 'عقرة', en: 'Akre' },
      { ar: 'العمادية', en: 'Amadiya' },
      { ar: 'سميل', en: 'Simele' },
      { ar: 'شيخان', en: 'Shekhan' },
      { ar: 'بردرش', en: 'Bardarash' }
    ]
  }
];

/**
 * Infer Governorate (Arabic & English) from a branch/office name if not explicitly set on the branch record
 */
export function inferGovernorateFromBranchName(branchName: string): { ar: string; en: string } | null {
  const raw = String(branchName || '').trim().toLowerCase();
  if (!raw) return null;

  for (const gov of IRAQ_GOVERNORATES) {
    if (
      raw.includes(gov.ar.toLowerCase()) ||
      raw.includes(gov.en.toLowerCase())
    ) {
      return { ar: gov.ar, en: gov.en };
    }
    for (const d of gov.districts) {
      if (raw.includes(d.ar.toLowerCase()) || raw.includes(d.en.toLowerCase())) {
        return { ar: gov.ar, en: gov.en };
      }
    }
  }

  // Common VITAS Iraq office aliases
  if (raw.includes('حلة') || raw.includes('حله') || raw.includes('hilla') || raw.includes('babylon')) {
    return { ar: 'بابل', en: 'Babil' };
  }
  if (raw.includes('ديوانية') || raw.includes('ديوانيه') || raw.includes('diwaniya')) {
    return { ar: 'القادسية (الديوانية)', en: 'Al-Qadisiyah (Diwaniyah)' };
  }
  if (raw.includes('سماوة') || raw.includes('سماوه') || raw.includes('samawa')) {
    return { ar: 'المثنى', en: 'Al-Muthanna' };
  }
  if (raw.includes('عمارة') || raw.includes('عماره') || raw.includes('amara')) {
    return { ar: 'ميسان', en: 'Maysan' };
  }
  if (raw.includes('كوت') || raw.includes('kut')) {
    return { ar: 'واسط', en: 'Wasit' };
  }
  if (raw.includes('ناصرية') || raw.includes('ناصريه') || raw.includes('nasiriya')) {
    return { ar: 'ذي قار', en: 'Dhi Qar' };
  }
  if (raw.includes('بصرة') || raw.includes('بصره') || raw.includes('basra') || raw.includes('basrah')) {
    return { ar: 'البصرة', en: 'Basra' };
  }
  if (raw.includes('نجف') || raw.includes('najaf')) {
    return { ar: 'النجف', en: 'Najaf' };
  }
  if (raw.includes('كربلاء') || raw.includes('كربلا') || raw.includes('karbala')) {
    return { ar: 'كربلاء', en: 'Karbala' };
  }
  if (raw.includes('كرادة') || raw.includes('منصور') || raw.includes('رصافة') || raw.includes('كرخ') || raw.includes('وحدة') || raw.includes('بغداد') || raw.includes('baghdad')) {
    return { ar: 'بغداد', en: 'Baghdad' };
  }

  return null;
}

/**
 * Translate/format a stored Governorate or "Governorate - District" string into Arabic or English
 */
export function formatWorkLocation(value: string | null | undefined, lang: 'ar' | 'en' = 'ar'): string {
  const raw = String(value || '').trim();
  if (!raw || raw === '-' || raw === 'غير محدد' || raw === 'N/A') return '';
  const norm = raw.toLowerCase();

  for (const gov of IRAQ_GOVERNORATES) {
    if (norm === gov.ar.toLowerCase() || norm === gov.en.toLowerCase()) {
      return lang === 'en' ? gov.en : gov.ar;
    }
    for (const dist of gov.districts) {
      const arFull = `${gov.ar} - ${dist.ar}`;
      const enFull = `${gov.en} - ${dist.en}`;
      if (
        norm === arFull.toLowerCase() ||
        norm === enFull.toLowerCase() ||
        norm === dist.ar.toLowerCase() ||
        norm === dist.en.toLowerCase()
      ) {
        return lang === 'en' ? enFull : arFull;
      }
    }
  }

  // Fallback: try inferring governorate if it's a branch/city alias
  const inferred = inferGovernorateFromBranchName(raw);
  if (inferred && raw.length <= 30 && !raw.includes(' - ')) {
    return lang === 'en' ? inferred.en : inferred.ar;
  }
  return raw;
}

/**
 * Translate a standalone district name into Arabic or English if known
 */
export function formatDistrictName(value: string | null | undefined, lang: 'ar' | 'en' = 'ar'): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const norm = raw.toLowerCase();
  for (const gov of IRAQ_GOVERNORATES) {
    for (const dist of gov.districts) {
      if (norm === dist.ar.toLowerCase() || norm === dist.en.toLowerCase()) {
        return lang === 'en' ? dist.en : dist.ar;
      }
    }
  }
  return raw;
}

/**
 * Flat list of all work location options (Governorate + Governorate - District)
 */
export function getAllIraqWorkLocations(lang: 'ar' | 'en' = 'ar'): Array<{ value: string; label: string; group: string }> {
  const options: Array<{ value: string; label: string; group: string }> = [];
  for (const gov of IRAQ_GOVERNORATES) {
    const govLabel = lang === 'en' ? gov.en : gov.ar;
    options.push({
      value: gov.ar,
      label: lang === 'en' ? `${gov.en} (Governorate)` : `${gov.ar} (المحافظة)`,
      group: govLabel
    });
    for (const d of gov.districts) {
      options.push({
        value: `${gov.ar} - ${d.ar}`,
        label: lang === 'en' ? `${gov.en} - ${d.en}` : `${gov.ar} - ${d.ar}`,
        group: govLabel
      });
    }
  }
  return options;
}
