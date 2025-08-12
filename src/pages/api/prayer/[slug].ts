import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';

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

    const entries = await client.getEntries<PrayerSkeleton>({
      content_type: `prayer-${langCode}`,
      'fields.slug': slugStr,
      limit: 1,
    });

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