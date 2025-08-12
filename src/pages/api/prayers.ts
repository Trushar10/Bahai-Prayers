import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/contentful';
import { EntrySkeletonType, EntryFieldTypes } from 'contentful';

type PrayerSkeleton = EntrySkeletonType<{
  title: EntryFieldTypes.Text;
  slug: EntryFieldTypes.Text;
}>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const langCode = (req.query.lang as string) || 'en';
    
    // Fetch prayers with tags included
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

    let tags: { sys: { id: string }, name?: string }[] = [];
    
    // Try to get tag names from Management API first, with fallback
    if (tagIds.length > 0) {
      try {
        const spaceId = process.env.CONTENTFUL_SPACE_ID;
        const mgmtToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
        
        console.log('Environment check:', {
          hasSpaceId: !!spaceId,
          hasMgmtToken: !!mgmtToken,
          tagCount: tagIds.length,
          tagIds: tagIds.slice(0, 3), // Show first 3 tag IDs for debugging
        });
        
        if (!spaceId || !mgmtToken) {
          console.warn('Management API credentials not available, using fallback tag names');
          throw new Error('Management API credentials missing');
        }

        console.log('Fetching tags from Contentful Management API');
        const tagRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/tags`, {
          headers: {
            'Authorization': `Bearer ${mgmtToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!tagRes.ok) {
          console.error(`Management API error: ${tagRes.status} ${tagRes.statusText}`);
          const errorText = await tagRes.text();
          console.error('Error response:', errorText);
          throw new Error(`Management API returned ${tagRes.status}: ${tagRes.statusText}`);
        }
        
        const tagData = await tagRes.json();
        console.log('Management API response received, items count:', tagData.items?.length || 0);
        
        if (Array.isArray(tagData.items)) {
          tags = (tagData.items as Array<unknown>)
            .filter(tag => tagIds.includes((tag as { sys: { id: string } }).sys.id))
            .map(tag => {
              const t = tag as { sys: { id: string }, name?: string };
              return { sys: { id: t.sys.id }, name: String(t.name) };
            });
          console.log('Successfully filtered tags:', tags.length);
        }
      } catch (managementApiError) {
        console.error('Management API failed:', managementApiError);
        
        // Fallback: Create readable tag names from tag IDs
        console.log('Using fallback tag name generation for:', tagIds);
        tags = tagIds.map(tagId => ({
          sys: { id: tagId },
          name: generateReadableTagName(tagId)
        }));
        console.log('Generated fallback tags:', tags);
      }
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ items: sortedItems, tags });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}

// Fallback function to generate readable tag names from IDs
function generateReadableTagName(tagId: string): string {
  // Convert tag IDs to readable names
  const tagNameMap: { [key: string]: string } = {
    'obligatory-prayers': 'The Obligatory Prayers',
    'general-prayers': 'General Prayers',
    'morning-prayers': 'Morning Prayers',
    'evening-prayers': 'Evening Prayers',
    'daily-prayers': 'Daily Prayers',
    'special-prayers': 'Special Prayers',
    'healing-prayers': 'Healing Prayers',
    'protection-prayers': 'Protection Prayers',
    'spiritual-development': 'Spiritual Development',
    'devotional-prayers': 'Devotional Prayers',
    'bahai-prayers': 'Bahá\'í Prayers',
    'unity-prayers': 'Unity Prayers',
    'guidance-prayers': 'Guidance Prayers',
    'gratitude-prayers': 'Gratitude Prayers',
    'fast-prayers': 'Fast and Fasting',
    'pilgrimage-prayers': 'Pilgrimage Prayers',
    'tablet-prayers': 'Tablet Prayers',
    'short-prayers': 'Short Prayers',
    'long-prayers': 'Long Prayers',
    // Add common variations
    'obligatory': 'The Obligatory Prayers',
    'general': 'General Prayers',
    'morning': 'Morning Prayers',
    'evening': 'Evening Prayers',
    'daily': 'Daily Prayers',
    'special': 'Special Prayers',
    'healing': 'Healing Prayers',
    'protection': 'Protection Prayers',
  };
  
  // Return mapped name or convert ID to title case
  return tagNameMap[tagId] || tagId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
