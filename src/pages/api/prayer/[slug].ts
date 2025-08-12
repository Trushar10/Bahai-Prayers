import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  content: EntryFieldTypes.RichText;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { slug, lang } = req.query;
    const langCode = (lang as string) || 'en';
    const slugStr = Array.isArray(slug) ? slug[0] : slug;

    const entries = await client.getEntries<PrayerSkeleton>({
      content_type: `prayer-${langCode}`,
      'fields.slug': slugStr,
    });

    if (!entries.items.length) {
      res.status(404).json({ error: 'Prayer not found' });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json(entries.items[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch prayer' });
  }
}