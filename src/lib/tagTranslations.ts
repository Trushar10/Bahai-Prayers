/**
 * Centralized translation system for tag names
 * Scalable to unlimited languages without platform restrictions
 */

export interface TagTranslations {
  [tagId: string]: {
    [languageCode: string]: string;
  };
}

export const tagTranslations: TagTranslations = {
  'obligatory-prayers': {
    'en': 'The Obligatory Prayers',
    'hi': 'अनिवार्य प्रार्थनाएँ',
    'gu': 'અનિવાર્ય પ્રાર્થના'
  },
  'general-prayers': {
    'en': 'General Prayers',
    'hi': 'सामान्य प्रार्थनाएँ',
    'gu': 'સામાન્ય પ્રાર્થનાઓ'
  },
  // Variant tag IDs (with language suffixes) that map to the same translations
  'obligatory-prayers-gu': {
    'en': 'The Obligatory Prayers',
    'hi': 'अनिवार्य प्रार्थनाएँ',
    'gu': 'અનિવાર્ય પ્રાર્થના'
  },
  'general-prayers-gu': {
    'en': 'General Prayers',
    'hi': 'सामान्य प्रार्थनाएँ',
    'gu': 'સામાન્ય પ્રાર્થનાઓ'
  },
  'obligatory-prayers-hi': {
    'en': 'The Obligatory Prayers',
    'hi': 'अनिवार्य प्रार्थनाएँ',
    'gu': 'અનિવાર્ય પ્રાર્થના'
  },
  'general-prayers-hi': {
    'en': 'General Prayers',
    'hi': 'सामान्य प्रार्थनाएँ',
    'gu': 'સામાન્ય પ્રાર્થનાઓ'
  },
  'generalPrayers': {
    'en': 'General Prayers',
    'hi': 'सामान्य प्रार्थनाएँ',
    'gu': 'સામાન્ય પ્રાર્થનાઓ'
  },
  'theObligatoryPrayers': {
    'en': 'The Obligatory Prayers',
    'hi': 'अनिवार्य प्रार्थनाएँ',
    'gu': 'અનિવાર્ય પ્રાર્થના'
  },
  'obligatoryPrayers': {
    'en': 'The Obligatory Prayers',
    'hi': 'अनिवार्य प्रार्थनाएँ',
    'gu': 'અનિવાર્ય પ્રાર્થના'
  }
};

/**
 * Get translated tag name
 * @param tagId - The tag identifier
 * @param languageCode - Two-letter language code (en, hi, gu, ar, etc.)
 * @returns Translated tag name or fallback
 */
export function getTagTranslation(tagId: string, languageCode: string): string {
  // Direct lookup
  const translation = tagTranslations[tagId]?.[languageCode];
  if (translation) {
    return translation;
  }

  // Try without language suffix (e.g., 'obligatory-prayers-gu' -> 'obligatory-prayers')
  const cleanTagId = tagId.replace(/-(gu|hi|en)$/, '');
  const cleanTranslation = tagTranslations[cleanTagId]?.[languageCode];
  if (cleanTranslation) {
    return cleanTranslation;
  }

  // Fallback to English
  const englishTranslation = tagTranslations[tagId]?.['en'] || tagTranslations[cleanTagId]?.['en'];
  if (englishTranslation) {
    return englishTranslation;
  }

  // Final fallback: generate from ID
  return tagId
    .replace(/-(gu|hi|en)$/, '')
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): string[] {
  return ['en', 'hi', 'gu'];
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(languageCode: string): boolean {
  return getSupportedLanguages().includes(languageCode);
}
