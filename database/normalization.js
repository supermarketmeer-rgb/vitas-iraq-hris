export const DEFAULT_PREFIXES = [
  'Junior', 'Senior', 'Jr.', 'Sr.', 'Jr', 'Sr',
  'Lead', 'Associate', 'Staff', 'Principal', 'Executive',
  'مبتدئ', 'أول', 'رئيسي', 'كبير', 'مساعد', 'معاون', 'نائب'
];

export const DEFAULT_SUFFIXES = [
  'I', 'II', 'III', 'IV', 'V',
  'Jr.', 'Sr.', 'Jr', 'Sr',
  'Level 1', 'Level 2', 'Level 3', 'Tier 1', 'Tier 2'
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanSpacingAndPunctuation(str) {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-_/]+|[\s,.\-_/]+$/g, '')
    .trim();
}

/**
 * Normalizes a job title string using configured rules and canonical patterns.
 */
export function normalizeJobTitle(rawTitle, customRules = []) {
  if (!rawTitle) return { normalizedTitle: '' };

  let title = String(rawTitle).trim();

  // 1. Check exact custom alias rules first
  for (const rule of customRules) {
    if (!rule.is_active) continue;

    if (rule.rule_type === 'alias') {
      if (title.toLowerCase() === String(rule.pattern).toLowerCase().trim()) {
        return { normalizedTitle: String(rule.replacement).trim(), appliedRule: `Alias: ${rule.pattern}` };
      }
    } else if (rule.rule_type === 'regex') {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(title)) {
          const replaced = title.replace(regex, rule.replacement).trim();
          return { normalizedTitle: cleanSpacingAndPunctuation(replaced), appliedRule: `Regex: ${rule.pattern}` };
        }
      } catch (err) {
        console.error('Invalid regex in normalization rule:', rule.pattern, err);
      }
    }
  }

  // 2. Normalize capitalization and excess whitespace
  title = cleanSpacingAndPunctuation(title);

  // 3. Remove prefixes
  const activeCustomPrefixes = customRules
    .filter(r => r.is_active && r.rule_type === 'prefix')
    .map(r => String(r.pattern).trim());
  
  const allPrefixes = [...new Set([...activeCustomPrefixes, ...DEFAULT_PREFIXES])];

  for (const prefix of allPrefixes) {
    const prefixRegex = new RegExp(`^${escapeRegex(prefix)}(\\s+|-|\\.\\s*)`, 'i');
    if (prefixRegex.test(title)) {
      title = title.replace(prefixRegex, '').trim();
      break;
    }
  }

  // 4. Remove suffixes
  const activeCustomSuffixes = customRules
    .filter(r => r.is_active && r.rule_type === 'suffix')
    .map(r => String(r.pattern).trim());
  
  const allSuffixes = [...new Set([...activeCustomSuffixes, ...DEFAULT_SUFFIXES])];

  for (const suffix of allSuffixes) {
    const suffixRegex = new RegExp(`(\\s+|-|,\\s*)${escapeRegex(suffix)}$`, 'i');
    if (suffixRegex.test(title)) {
      title = title.replace(suffixRegex, '').trim();
      break;
    }
  }

  // Final cleanup of punctuation and extra spaces
  title = cleanSpacingAndPunctuation(title);

  return { normalizedTitle: title || rawTitle };
}
