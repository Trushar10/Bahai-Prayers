import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Create Contentful Management client

  try {
    const langCode = (req.query.lang as string) || 'en';
    // Fetch prayers
    const entries = await client.getEntries<PrayerSkeleton>({
      content_type: `prayer-${langCode}`,
      include: 2 // ensure tags are included in linked entries
    });
    const sortedItems = entries.items.sort((a, b) =>
      a.fields.title.localeCompare(b.fields.title)
    );

    // Collect all unique tag IDs from prayers
    const tagIds = Array.from(new Set(
      sortedItems.flatMap(prayer =>
        (prayer.metadata?.tags || []).map(tag => tag.sys?.id)
      ).filter(Boolean)
    ));

    // Fetch tag details using Management API
    let tags: { sys: { id: string }, name?: string }[] = [];
    if (tagIds.length > 0) {
      // Use REST API to fetch tags
      const spaceId = process.env.CONTENTFUL_SPACE_ID as string;
      const mgmtToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN as string;
        console.log('Fetching tags from Contentful Management API:', `https://api.contentful.com/spaces/${spaceId}/tags`);
        console.log('Tag IDs requested:', tagIds);
      const tagRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/tags`, {
        headers: {
          'Authorization': `Bearer ${mgmtToken}`,
          'Content-Type': 'application/json',
        },
      });
      const tagData = await tagRes.json();
        console.log('Raw tag API response:', tagData);
        if (Array.isArray(tagData.items)) {
          tags = (tagData.items as Array<unknown>)
            .filter(tag => tagIds.includes((tag as { sys: { id: string } }).sys.id))
            .map(tag => {
              const t = tag as { sys: { id: string }, name?: string };
              return { sys: { id: t.sys.id }, name: String(t.name) };
            });
          console.log('Filtered tags:', tags);
        } else {
          tags = [];
          console.log('No tags found in API response.');
        }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ items: sortedItems, tags });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}
