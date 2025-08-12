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
          name: generateReadableTagName(tagId, langCode)
        }));
        console.log('Generated fallback tags:', tags);
      }
    }

    // Ensure we always have tags if we have tagIds
    if (tagIds.length > 0 && tags.length === 0) {
      console.warn('No tags generated, creating emergency fallback');
      tags = tagIds.map(tagId => ({
        sys: { id: tagId },
        name: generateReadableTagName(tagId, langCode)
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
          name: generateReadableTagName(tagId, langCode)
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

// Fallback function to generate readable tag names from IDs with localization support
function generateReadableTagName(tagId: string, langCode: string = 'en'): string {
  // Localized tag name mappings
  const tagMappings: Record<string, Record<string, string>> = {
    'obligatory-prayers': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    'general-prayers': {
      'en': 'General Prayers',
      'hi': 'सामान्य प्रार्थनाएँ',
      'gu': 'સામાન્ય પ્રાર્થનાઓ'
    },
    'morning-prayers': {
      'en': 'Morning Prayers',
      'hi': 'प्रातःकालीन प्रार्थनाएँ',
      'gu': 'સવારની પ્રાર્થનાઓ'
    },
    'evening-prayers': {
      'en': 'Evening Prayers',
      'hi': 'सायंकालीन प्रार्थनाएँ',
      'gu': 'સાંજની પ્રાર્થનાઓ'
    },
    'daily-prayers': {
      'en': 'Daily Prayers',
      'hi': 'दैनिक प्रार्थनाएँ',
      'gu': 'દૈનિક પ્રાર્થનાઓ'
    },
    'special-prayers': {
      'en': 'Special Prayers',
      'hi': 'विशेष प्रार्थनाएँ',
      'gu': 'વિશેષ પ્રાર્થનાઓ'
    },
    'healing-prayers': {
      'en': 'Healing Prayers',
      'hi': 'आरोग्य प्रार्थनाएँ',
      'gu': 'આરોગ્ય પ્રાર્થનાઓ'
    },
    'protection-prayers': {
      'en': 'Protection Prayers',
      'hi': 'सुरक्षा प्रार्थनाएँ',
      'gu': 'સુરક્ષા પ્રાર્થનાઓ'
    },
    'spiritual-development': {
      'en': 'Spiritual Development',
      'hi': 'आध्यात्मिक विकास',
      'gu': 'આધ્યાત્મિક વિકાસ'
    },
    'devotional-prayers': {
      'en': 'Devotional Prayers',
      'hi': 'भक्ति प्रार्थनाएँ',
      'gu': 'ભક્તિ પ્રાર્થનાઓ'
    },
    'unity-prayers': {
      'en': 'Unity Prayers',
      'hi': 'एकता प्रार्थनाएँ',
      'gu': 'એકતા પ્રાર્થનાઓ'
    },
    'guidance-prayers': {
      'en': 'Guidance Prayers',
      'hi': 'मार्गदर्शन प्रार्थनाएँ',
      'gu': 'માર્ગદર્શન પ્રાર્થનાઓ'
    },
    'gratitude-prayers': {
      'en': 'Gratitude Prayers',
      'hi': 'कृतज्ञता प्रार्थनाएँ',
      'gu': 'કૃતજ્ઞતા પ્રાર્થનાઓ'
    },
    // Camel case variations
    'generalPrayers': {
      'en': 'General Prayers',
      'hi': 'सामान्य प्रार्थनाएँ',
      'gu': 'સામાન્ય પ્રાર્થનાઓ'
    },
    'theObligatoryPrayers': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    'obligatoryPrayers': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    // Single word variations
    'obligatory': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    'general': {
      'en': 'General Prayers',
      'hi': 'सामान्य प्रार्थनाएँ',
      'gu': 'સામાન્ય પ્રાર્થનાઓ'
    }
  };
  
  // Log the mapping for debugging in production
  console.log(`Generating fallback name for tag ID: "${tagId}" in language: "${langCode}"`);
  
  // First try to get localized name
  const localizedName = tagMappings[tagId]?.[langCode];
  if (localizedName) {
    console.log(`Found localized name: "${tagId}" -> "${localizedName}"`);
    return localizedName;
  }

  // Fallback to English if available
  const englishName = tagMappings[tagId]?.['en'];
  if (englishName) {
    console.log(`Using English fallback: "${tagId}" -> "${englishName}"`);
    return englishName;
  }

  // Final fallback to generated name
  const fallbackName = tagId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
    
  console.log(`Using generated fallback: "${tagId}" -> "${fallbackName}"`);
  return fallbackName;
}
