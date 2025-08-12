import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';

// Helper function to clean URL slugs (replace spaces with hyphens)
const cleanUrlSlug = (text: string): string => {
  return text
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/\-\-+/g, '-'); // Replace multiple hyphens with single hyphen
}

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  body: EntryFieldTypes.RichText;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { slug } = req.query;
    const langCode = (req.query.lang as string) || 'en';
    const slugStr = Array.isArray(slug) ? slug[0] : slug;

    if (!slugStr) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // First try to find by original slug field
    const entries = await client.getEntries<PrayerSkeleton>({
      content_type: `prayer-${langCode}`,
      'fields.slug': slugStr,
      limit: 1,
    });

    // If not found, try to find by matching cleaned slug
    if (!entries.items.length) {
      const allEntries = await client.getEntries<PrayerSkeleton>({
        content_type: `prayer-${langCode}`,
      });
      
      const matchingEntry = allEntries.items.find(item => {
        return cleanUrlSlug(item.fields.slug) === slugStr;
      });

      if (matchingEntry) {
        // Use the matching entry directly
        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.status(200).json({ prayer: matchingEntry });
        return;
      }
    }

    if (!entries.items.length) {
      res.status(404).json({ error: 'Prayer not found' });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ prayer: entries.items[0] });
  } catch (error) {
    console.error('Error fetching prayer:', error);
    res.status(500).json({ error: 'Failed to fetch prayer' });
  }
}