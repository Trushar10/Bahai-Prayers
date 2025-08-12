import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';
import { getTagTranslation, isLanguageSupported } from '../../lib/tagTranslations';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const langCode = (req.query.lang as string) || 'en';
    
    // Validate language code - fallback to English if unsupported
    const validLangCode = isLanguageSupported(langCode) ? langCode : 'en';
    if (langCode !== validLangCode) {
      console.warn(`Unsupported language code: ${langCode}, using English instead`);
    }
    
    // Fetch prayers with tags included
    const entries = await client.getEntries<PrayerSkeleton>({
      content_type: `prayer-${langCode}`, // Keep original langCode for Contentful query
      include: 2 // ensure tags are included in linked entries
    });
    
    // Sort prayers by title - prayer titles remain in their original language
    const sortedItems = entries.items.sort((a, b) =>
      a.fields.title.localeCompare(b.fields.title)
    );

    // Collect all unique tag IDs from prayers
    const tagIds = Array.from(new Set(
      sortedItems.flatMap(prayer =>
        (prayer.metadata?.tags || []).map(tag => tag.sys?.id)
      ).filter(Boolean)
    ));

    console.log(`Found ${tagIds.length} unique tag IDs for language "${langCode}":`, tagIds);

    // ONLY translate tag names - prayer titles stay in original language
    const tags = tagIds.map(tagId => ({
      sys: { id: tagId },
      name: getTagTranslation(tagId, validLangCode) // Use validated language for tag translation
    }));

    console.log(`Generated ${tags.length} localized tag names for "${validLangCode}":`, 
      tags.map(tag => `"${tag.sys.id}" -> "${tag.name}"`));

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ 
      items: sortedItems, // Prayer titles remain in original language from Contentful
      tags // Only tag names are translated
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}
