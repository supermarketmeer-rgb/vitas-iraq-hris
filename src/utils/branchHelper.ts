/**
 * Utility for localizing Branch and Office names across the application.
 * Ensures consistent, high-fidelity English and Arabic names for all Iraqi branches.
 */

export const BRANCH_NAMES_MAP: Record<string, { ar: string; en: string }> = {
  // Baghdad offices / branches
  'بغداد_المنصور': { ar: 'بغداد - المنصور', en: 'Baghdad - Mansour' },
  'بغداد - المنصور': { ar: 'بغداد - المنصور', en: 'Baghdad - Mansour' },
  'المنصور': { ar: 'المنصور', en: 'Mansour' },
  'Mansour': { ar: 'المنصور', en: 'Mansour' },

  'بغداد_الوحدة': { ar: 'بغداد - الوحدة', en: 'Baghdad - Wehda' },
  'بغداد - الوحدة': { ar: 'بغداد - الوحدة', en: 'Baghdad - Wehda' },
  'الوحدة': { ar: 'الوحدة', en: 'Wehda' },
  'Wehda': { ar: 'الوحدة', en: 'Wehda' },

  'بغداد_الكرادة': { ar: 'بغداد - الكرادة', en: 'Baghdad - Karrada' },
  'بغداد - الكرادة': { ar: 'بغداد - الكرادة', en: 'Baghdad - Karrada' },
  'الكرادة': { ar: 'الكرادة', en: 'Karrada' },
  'Karrada': { ar: 'الكرادة', en: 'Karrada' },

  'بغداد_الشعب': { ar: 'بغداد - الشعب', en: 'Baghdad - Shaab' },
  'بغداد - الشعب': { ar: 'بغداد - الشعب', en: 'Baghdad - Shaab' },
  'الشعب': { ar: 'الشعب', en: 'Shaab' },
  'Shaab': { ar: 'الشعب', en: 'Shaab' },

  'بغداد': { ar: 'بغداد', en: 'Baghdad' },
  'Baghdad': { ar: 'بغداد', en: 'Baghdad' },

  // Wasit / Kut
  'الكوت': { ar: 'الكوت', en: 'Kut' },
  'كوت': { ar: 'الكوت', en: 'Kut' },
  'Kut': { ar: 'الكوت', en: 'Kut' },
  'واسط': { ar: 'واسط', en: 'Wasit' },
  'Wasit': { ar: 'واسط', en: 'Wasit' },
  'فرع واسط': { ar: 'فرع واسط', en: 'Wasit Branch' },

  // Basra
  'البصرة': { ar: 'البصرة', en: 'Basra' },
  'بصرة': { ar: 'البصرة', en: 'Basra' },
  'Basra': { ar: 'البصرة', en: 'Basra' },
  'Bassrah': { ar: 'البصرة', en: 'Basra' },
  'البصرة_المدينة': { ar: 'البصرة - المدينة', en: 'Basra - Mudayna' },
  'Bassrah-Mudayna': { ar: 'البصرة - المدينة', en: 'Basra - Mudayna' },
  'فرع البصرة': { ar: 'فرع البصرة', en: 'Basra Branch' },
  'فرع البصرة - الجمهورية': { ar: 'فرع البصرة - الجمهورية', en: 'Basra - Republic Branch' },

  // Sulaymaniyah
  'السليمانية': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'سليمانية': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Sulaymaniya': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Sulaymaniyah': { ar: 'السليمانية', en: 'Sulaymaniyah' },
  'Slemani': { ar: 'السليمانية', en: 'Sulaymaniyah' },

  // Erbil
  'اربيل': { ar: 'أربيل', en: 'Erbil' },
  'أربيل': { ar: 'أربيل', en: 'Erbil' },
  'Erbil': { ar: 'أربيل', en: 'Erbil' },
  'هولير': { ar: 'أربيل', en: 'Erbil' },
  'Hawler': { ar: 'أربيل', en: 'Erbil' },

  // Najaf
  'النجف': { ar: 'النجف', en: 'Najaf' },
  'نجف': { ar: 'النجف', en: 'Najaf' },
  'Najaf': { ar: 'النجف', en: 'Najaf' },
  'فرع النجف': { ar: 'فرع النجف', en: 'Najaf Branch' },

  // Karbala
  'كربلاء': { ar: 'كربلاء', en: 'Karbala' },
  'كربلا': { ar: 'كربلاء', en: 'Karbala' },
  'Karbala': { ar: 'كربلاء', en: 'Karbala' },
  'Kerbala': { ar: 'كربلاء', en: 'Karbala' },
  'كربلاء_الهندية': { ar: 'كربلاء - الهندية', en: 'Karbala - Hindia' },
  'Hindia': { ar: 'كربلاء - الهندية', en: 'Karbala - Hindia' },

  // Babylon / Babil
  'بابل_الحلة': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'بابل - الحلة': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'الحلة': { ar: 'الحلة', en: 'Hilla' },
  'Hilla': { ar: 'بابل - الحلة', en: 'Babylon - Hilla' },
  'بابل_الهاشمية': { ar: 'بابل - الهاشمية', en: 'Babylon - Hashimiya' },
  'الهاشمية': { ar: 'الهاشمية', en: 'Hashimiya' },
  'Hashmiya': { ar: 'بابل - الهاشمية', en: 'Babylon - Hashimiya' },
  'بابل': { ar: 'بابل', en: 'Babylon' },
  'Babil': { ar: 'بابل', en: 'Babylon' },
  'Babylon': { ar: 'بابل', en: 'Babylon' },
  'فرع بابل': { ar: 'فرع بابل', en: 'Babylon Branch' },

  // Diwaniyah
  'الديوانية': { ar: 'الديوانية', en: 'Diwaniyah' },
  'ديوانية': { ar: 'الديوانية', en: 'Diwaniyah' },
  'Diwaniya': { ar: 'الديوانية', en: 'Diwaniyah' },
  'Diwaniyah': { ar: 'الديوانية', en: 'Diwaniyah' },
  'القادسية': { ar: 'القادسية', en: 'Qadisiyah' },
  'Qadisiyah': { ar: 'القادسية', en: 'Qadisiyah' },

  // Nasiriyah / Dhi Qar
  'الناصرية': { ar: 'الناصرية', en: 'Nasiriyah' },
  'ناصرية': { ar: 'الناصرية', en: 'Nasiriyah' },
  'Nassiriya': { ar: 'الناصرية', en: 'Nasiriyah' },
  'Nasiriyah': { ar: 'الناصرية', en: 'Nasiriyah' },
  'ذي قار': { ar: 'ذي قار', en: 'Dhi Qar' },
  'Dhi Qar': { ar: 'ذي قار', en: 'Dhi Qar' },

  // Maysan / Amarah
  'ميسان': { ar: 'ميسان', en: 'Maysan' },
  'Maysan': { ar: 'ميسان', en: 'Maysan' },
  'العمارة': { ar: 'العمارة', en: 'Amarah' },
  'Amarah': { ar: 'العمارة', en: 'Amarah' },

  // Kirkuk
  'كركوك': { ar: 'كركوك', en: 'Kirkuk' },
  'Kirkuk': { ar: 'كركوك', en: 'Kirkuk' },

  // Duhok
  'دهوك': { ar: 'دهوك', en: 'Duhok' },
  'Duhok': { ar: 'دهوك', en: 'Duhok' },
  'Dohuk': { ar: 'دهوك', en: 'Duhok' },

  // Mosul / Nineveh
  'الموصل': { ar: 'الموصل', en: 'Mosul' },
  'موصل': { ar: 'الموصل', en: 'Mosul' },
  'Mosul': { ar: 'الموصل', en: 'Mosul' },
  'نينوى': { ar: 'نينوى', en: 'Nineveh' },
  'Nineveh': { ar: 'نينوى', en: 'Nineveh' },

  // Anbar / Ramadi
  'الانبار': { ar: 'الأنبار', en: 'Anbar' },
  'الأنبار': { ar: 'الأنبار', en: 'Anbar' },
  'Anbar': { ar: 'الأنبار', en: 'Anbar' },
  'الرمادي': { ar: 'الرمادي', en: 'Ramadi' },
  'Ramadi': { ar: 'الرمادي', en: 'Ramadi' },

  // Muthanna / Samawa
  'المثنى': { ar: 'المثنى', en: 'Muthanna' },
  'Muthanna': { ar: 'المثنى', en: 'Muthanna' },
  'السماوة': { ar: 'السماوة', en: 'Samawa' },
  'Samawa': { ar: 'السماوة', en: 'Samawa' },

  // Diyala / Baquba
  'ديالى': { ar: 'ديالى', en: 'Diyala' },
  'Diyala': { ar: 'ديالى', en: 'Diyala' },
  'بعقوبة': { ar: 'بعقوبة', en: 'Baquba' },

  // Salahuddin
  'صلاح الدين': { ar: 'صلاح الدين', en: 'Salahuddin' },
  'Salahuddin': { ar: 'صلاح الدين', en: 'Salahuddin' },
  'تكريت': { ar: 'تكريت', en: 'Tikrit' },

  // Headquarters / General Management
  'المقر الرئيسي': { ar: 'المقر الرئيسي (الإدارة العامة)', en: 'Head Office (HQ)' },
  'الإدارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'الادارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'الإدارة العامة - بغداد': { ar: 'الإدارة العامة - بغداد', en: 'HQ - Baghdad' },
  'فرع الإدارة العامة': { ar: 'الإدارة العامة', en: 'General Management (HQ)' },
  'Head Office': { ar: 'المقر الرئيسي', en: 'Head Office (HQ)' },
  'HQ': { ar: 'المقر الرئيسي', en: 'Head Office (HQ)' }
};

/**
 * Returns the localized name of a branch based on active language ('ar' or 'en').
 */
export function getBranchName(
  branch?: string | null,
  branchEn?: string | null,
  language: string = 'ar'
): string {
  if (!branch && !branchEn) {
    return language === 'en' ? 'Main Office' : 'المقر الرئيسي';
  }

  const raw = String(branch || branchEn || '').trim();
  const rawEn = String(branchEn || '').trim();

  if (language === 'en') {
    // 1. Direct dictionary match by raw (Arabic or English key)
    if (BRANCH_NAMES_MAP[raw]?.en) {
      return BRANCH_NAMES_MAP[raw].en;
    }
    // 2. Direct dictionary match by rawEn
    if (rawEn && BRANCH_NAMES_MAP[rawEn]?.en) {
      return BRANCH_NAMES_MAP[rawEn].en;
    }
    // 3. If rawEn is valid English (not 'N/A', not empty, and no Arabic script)
    if (rawEn && rawEn !== 'N/A' && rawEn !== 'null' && !/[\u0600-\u06FF]/.test(rawEn)) {
      return rawEn.replace(/_/g, ' ');
    }
    // 4. Try matching partial tokens in the map
    const match = Object.keys(BRANCH_NAMES_MAP).find(k => raw.includes(k) || k.includes(raw));
    if (match && BRANCH_NAMES_MAP[match]?.en) {
      return BRANCH_NAMES_MAP[match].en;
    }
    // 5. Clean up underscores
    return raw.replace(/_/g, ' ');
  } else {
    // Arabic
    if (BRANCH_NAMES_MAP[raw]?.ar) {
      return BRANCH_NAMES_MAP[raw].ar;
    }
    if (rawEn && BRANCH_NAMES_MAP[rawEn]?.ar) {
      return BRANCH_NAMES_MAP[rawEn].ar;
    }
    const match = Object.keys(BRANCH_NAMES_MAP).find(k => raw.includes(k) || k.includes(raw));
    if (match && BRANCH_NAMES_MAP[match]?.ar) {
      return BRANCH_NAMES_MAP[match].ar;
    }
    return raw.replace(/_/g, ' ');
  }
}
