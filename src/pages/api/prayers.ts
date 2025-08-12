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
                // Use localized name generation instead of just returning the Management API name
                return { sys: { id: t.sys.id }, name: generateLocalizedTagName(t.sys.id, langCode) };
              });
            console.log('Got tag names from Management API with localization:', tags.length);
          }
          
          if (tags.length === 0) {
            throw new Error('No tags returned from Management API');
          }
        } catch (managementApiError) {
          console.error('Management API failed, using final fallback:', managementApiError);
          
          // Final fallback: Generate localized names from tag IDs
          tags = tagIds.map(tagId => ({
            sys: { id: tagId },
            name: generateLocalizedTagName(tagId, langCode)
          }));
          console.log('Generated localized fallback tags:', tags);
        }
      }
    }

    // Ensure we always have tags if we have tagIds
    if (tagIds.length > 0 && tags.length === 0) {
      console.warn('No tags generated, creating emergency fallback');
      tags = tagIds.map(tagId => ({
        sys: { id: tagId },
        name: generateLocalizedTagName(tagId, langCode)
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
          name: generateLocalizedTagName(tagId, langCode)
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

// Function to generate localized tag names based on language
function generateLocalizedTagName(tagId: string, langCode: string): string {
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
    'obligatory-prayers-gu': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    'general-prayers-gu': {
      'en': 'General Prayers',
      'hi': 'सामान्य प्रार्થनाएँ',
      'gu': 'સામાન્ય પ્રાર્થનાઓ'
    },
    'obligatory-prayers-hi': {
      'en': 'The Obligatory Prayers',
      'hi': 'अनिवार्य प्रार्थनाएँ',
      'gu': 'ફરજિયાત પ્રાર્થનાઓ'
    },
    'general-prayers-hi': {
      'en': 'General Prayers',
      'hi': 'सामान्य प्रार्થनाएँ',
      'gu': 'સામાન્ય પ્રાર્થનાઓ'
    },
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
    'spiritual-development': {
      'en': 'Spiritual Development',
      'hi': 'आध्यात्मिक विकास',
      'gu': 'આધ્યાત્મિક વિકાસ'
    },
    'healing': {
      'en': 'Healing',
      'hi': 'आरोग्य',
      'gu': 'આરોગ્ય'
    },
    'unity': {
      'en': 'Unity',
      'hi': 'एकता',
      'gu': 'એકતા'
    },
    'forgiveness': {
      'en': 'Forgiveness',
      'hi': 'क्षमा',
      'gu': 'ક્ષમા'
    },
    'assistance': {
      'en': 'Assistance',
      'hi': 'सहायता',
      'gu': 'સહાયતા'
    },
    'departed': {
      'en': 'For the Departed',
      'hi': 'दिवंगत के लिए',
      'gu': 'દિવંગત માટે'
    },
    'steadfastness': {
      'en': 'Steadfastness',
      'hi': 'दृढ़ता',
      'gu': 'દૃઢતા'
    },
    'tests-difficulties': {
      'en': 'Tests and Difficulties',
      'hi': 'परेशानी और कठिनाई',
      'gu': 'પરેશાની અને મુશ્કેલીઓ'
    },
    'children': {
      'en': 'For Children',
      'hi': 'बच्चों के लिए',
      'gu': 'બાળકો માટે'
    },
    'youth': {
      'en': 'For Youth',
      'hi': 'युवाओं के लिए',
      'gu': 'યુવાઓ માટે'
    },
    'infants': {
      'en': 'For Infants',
      'hi': 'शिशुओं के लिए',
      'gu': 'શિશુઓ માટે'
    },
    'praise-gratitude': {
      'en': 'Praise and Gratitude',
      'hi': 'स्तुति और कृतज्ञता',
      'gu': 'સ્તુતિ અને કૃતજ્ઞતા'
    }
  };

  console.log(`Generating localized name for tag ID: "${tagId}" in language: "${langCode}"`);

  // First try to get localized name
  const localizedName = tagMappings[tagId]?.[langCode];
  if (localizedName) {
    console.log(`Found localized name: "${tagId}" -> "${localizedName}"`);
    return localizedName;
  }

  // Remove language suffixes and try again
  const cleanTagId = tagId.replace(/-(gu|hi|en)$/, '');
  const cleanLocalizedName = tagMappings[cleanTagId]?.[langCode];
  if (cleanLocalizedName) {
    console.log(`Found localized name for clean ID: "${cleanTagId}" -> "${cleanLocalizedName}"`);
    return cleanLocalizedName;
  }

  // Fallback to English if available
  const englishName = tagMappings[tagId]?.['en'] || tagMappings[cleanTagId]?.['en'];
  if (englishName) {
    console.log(`Using English fallback: "${tagId}" -> "${englishName}"`);
    return englishName;
  }

  // Final fallback to generated name
  const fallbackName = generateBasicTagName(tagId);
  console.log(`Using generated fallback: "${tagId}" -> "${fallbackName}"`);
  return fallbackName;
}

// Simple function to generate basic readable names from tag IDs
function generateBasicTagName(tagId: string): string {
  return tagId
    .replace(/-(gu|hi|en)$/, '') // Remove language suffixes
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
