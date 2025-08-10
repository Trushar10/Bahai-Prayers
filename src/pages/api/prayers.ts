import type { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/contentful';
import { Entry, EntryFieldTypes, EntrySkeletonType } from 'contentful';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
  body: EntryFieldTypes.RichText;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await client.getEntries<PrayerSkeleton>({
      content_type: 'prayer-eng',
      include: 1,
    });
    res.status(200).json(result.items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}
