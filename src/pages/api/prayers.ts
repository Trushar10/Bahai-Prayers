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

    let tags: { sys: { id: string }, name?: string }[] = [];
    
    // Try to get localized tag names from a tag-metadata content type
    if (tagIds.length > 0) {
      try {
        // First, try to fetch tag metadata from Contentful in the current language
        const tagMetadataEntries = await client.getEntries({
          content_type: 'tag-metadata',
          locale: langCode === 'en' ? 'en-US' : langCode,
          'fields.tagId[in]': tagIds.join(',')
        });

        if (tagMetadataEntries.items.length > 0) {
          tags = tagMetadataEntries.items.map(entry => ({
            sys: { id: entry.fields.tagId as string },
            name: entry.fields.displayName as string
          }));
          console.log(`Found ${tags.length} localized tag names from tag-metadata content type`);
        } else {
          throw new Error('No tag metadata found in Contentful');
        }
      } catch (tagMetadataError) {
        console.log('Tag metadata approach failed, trying Management API:', tagMetadataError);
        
        // Fallback to Management API approach
        try {
          const spaceId = process.env.CONTENTFUL_SPACE_ID;
          const mgmtToken = process.env.CONTENTFUL_MANAGEMENT_TOKEN;
          
          if (!spaceId || !mgmtToken) {
            throw new Error('Management API credentials missing');
          }

          const tagRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/tags`, {
            headers: {
              'Authorization': `Bearer ${mgmtToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!tagRes.ok) {
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
            console.log('Got tag names from Management API as fallback:', tags.length);
          }
          
          if (tags.length === 0) {
            throw new Error('No tags returned from Management API');
          }
        } catch (managementApiError) {
          console.error('Management API failed, using final fallback:', managementApiError);
          
          // Final fallback: Generate basic names from tag IDs
          tags = tagIds.map(tagId => ({
            sys: { id: tagId },
            name: generateBasicTagName(tagId)
          }));
          console.log('Generated basic fallback tags:', tags);
        }
      }
    }

    // Ensure we always have tags if we have tagIds
    if (tagIds.length > 0 && tags.length === 0) {
      console.warn('No tags generated, creating emergency fallback');
      tags = tagIds.map(tagId => ({
        sys: { id: tagId },
        name: generateBasicTagName(tagId)
      }));
    }

    // IMPORTANT: Always include mappings for the actual tag IDs found in prayers
    // even if Management API returned different IDs
    const finalTags = [...tags];
    
    // Add mappings for any tag IDs that we found in prayers but don't have names for
    tagIds.forEach(tagId => {
      const existingTag = finalTags.find(tag => tag.sys.id === tagId);
      if (!existingTag) {
        console.log(`Adding missing tag mapping for: ${tagId}`);
        finalTags.push({
          sys: { id: tagId },
          name: generateBasicTagName(tagId)
        });
      }
    });

    console.log('Final tags being returned:', finalTags);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.status(200).json({ items: sortedItems, tags: finalTags });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch prayers' });
  }
}

// Simple function to generate basic readable names from tag IDs (no hard-coded localization)
function generateBasicTagName(tagId: string): string {
  return tagId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
