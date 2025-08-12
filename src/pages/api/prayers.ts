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

    console.log('All tag IDs found in prayers:', tagIds);
    console.log('Processing prayers API request for production debugging');

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
        });
        
        if (!spaceId || !mgmtToken) {
          console.warn('Management API credentials not available, using fallback tag names');
          throw new Error('Management API credentials missing');
        }

        const tagRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/tags`, {
          headers: {
            'Authorization': `Bearer ${mgmtToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!tagRes.ok) {
          console.error(`Management API error: ${tagRes.status} ${tagRes.statusText}`);
          throw new Error(`Management API returned ${tagRes.status}: ${tagRes.statusText}`);
        }
        
        const tagData = await tagRes.json();
        
        if (Array.isArray(tagData.items)) {
          tags = (tagData.items as Array<unknown>)
            .filter(tag => tagIds.includes((tag as { sys: { id: string } }).sys.id))
            .map(tag => {
              const t = tag as { sys: { id: string }, name?: string };
              return { sys: { id: t.sys.id }, name: String(t.name) };
            });
          console.log('Successfully got tag names from Management API:', tags.length);
        }
        
        // If we didn't get any tags from Management API, fall back
        if (tags.length === 0) {
          throw new Error('No tags returned from Management API');
        }
      } catch (managementApiError) {
        console.error('Management API failed, using fallback:', managementApiError);
        
        // Fallback: Create readable tag names from tag IDs
        tags = tagIds.map(tagId => ({
          sys: { id: tagId },
          name: generateReadableTagName(tagId)
        }));
        console.log('Generated fallback tags:', tags);
      }
    }

    // Ensure we always have tags if we have tagIds
    if (tagIds.length > 0 && tags.length === 0) {
      console.warn('No tags generated, creating emergency fallback');
      tags = tagIds.map(tagId => ({
        sys: { id: tagId },
        name: generateReadableTagName(tagId)
      }));
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
    // Add common variations and actual IDs from your space
    'obligatory': 'The Obligatory Prayers',
    'general': 'General Prayers',
    'morning': 'Morning Prayers',
    'evening': 'Evening Prayers',
    'daily': 'Daily Prayers',
    'special': 'Special Prayers',
    'healing': 'Healing Prayers',
    'protection': 'Protection Prayers',
    // These seem to be the actual IDs from your Contentful space
    'generalPrayers': 'General Prayers',
    'theObligatoryPrayers': 'The Obligatory Prayers',
    'obligatoryPrayers': 'The Obligatory Prayers',
    'specialPrayers': 'Special Prayers',
    'morningPrayers': 'Morning Prayers',
    'eveningPrayers': 'Evening Prayers',
    'healingPrayers': 'Healing Prayers',
    'protectionPrayers': 'Protection Prayers',
  };
  
  // Log the mapping for debugging in production
  console.log(`Generating fallback name for tag ID: "${tagId}"`);
  
  // Return mapped name or convert ID to title case
  const fallbackName = tagNameMap[tagId] || tagId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  console.log(`Fallback result: "${tagId}" -> "${fallbackName}"`);
  return fallbackName;
}
