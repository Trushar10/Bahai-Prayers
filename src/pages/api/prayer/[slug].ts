import type { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../../lib/contentful';
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  body: EntryFieldTypes.RichText;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { slug } = req.query;
  try {
    const result = await client.getEntries<PrayerSkeleton>({
      content_type: 'prayer-eng',
      'fields.slug': slug as string,
    });
    if (result.items.length) {
      res.status(200).json(result.items[0]);
    } else {
      res.status(404).json({ error: 'Prayer not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prayer' });
  }
}
