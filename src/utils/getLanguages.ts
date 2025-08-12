import { client } from '../lib/contentful';
import { LANGUAGE_NAMES } from './languageNames';

export type Language = { code: string; name: string };

/**
 * Reads Contentful content type ids and returns languages found of the form `prayer-xx`
 * Normalizes 'eng' -> 'en' (common) but otherwise keeps the suffix as-is (lowercased).
 */
export async function getAvailableLanguages(): Promise<Language[]> {
  try {
    const res = await client.getContentTypes();
    const langsMap = new Map<string, Language>();

    for (const ct of res.items) {
      if (!ct.sys?.id) continue;
      const m = /^prayer-([a-zA-Z]{2,3})$/.exec(ct.sys.id);
      if (!m) continue;
      let code = m[1].toLowerCase();
      if (code === 'eng') code = 'en'; // normalize common 'eng' → 'en'
      const name = LANGUAGE_NAMES[code] || code.toUpperCase();
      if (!langsMap.has(code)) langsMap.set(code, { code, name });
    }

    const langs = Array.from(langsMap.values());
    // Put 'en' first if present
    langs.sort((a, b) => (a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.name.localeCompare(b.name)));
    return langs;
  } catch (err) {
    console.error('Failed to read languages from Contentful:', err);
    // Fallback to English
    return [{ code: 'en', name: 'English' }];
  }
}
