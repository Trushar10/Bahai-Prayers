import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '../../lib/contentful';

/**
 * Test API endpoint to verify tag-metadata content type setup
 * Usage: GET /api/test-tag-metadata?lang=hi
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const langCode = (req.query.lang as string) || 'en';
    
    console.log(`\n=== Testing tag-metadata for language: ${langCode} ===`);
    
    // Test 1: Check if tag-metadata content type exists
    try {
      const testEntries = await client.getEntries({
        content_type: 'tag-metadata',
        limit: 1
      });
      
      console.log('✅ tag-metadata content type exists');
      console.log(`   Found ${testEntries.total} total entries`);
      
      if (testEntries.total === 0) {
        return res.status(200).json({
          success: false,
          message: 'tag-metadata content type exists but no entries found',
          instructions: 'Create tag metadata entries following CONTENTFUL_SETUP_DETAILED.md'
        });
      }
    } catch (error) {
      console.log('❌ tag-metadata content type not found');
      return res.status(200).json({
        success: false,
        message: 'tag-metadata content type not found',
        error: error instanceof Error ? error.message : 'Unknown error',
        instructions: 'Create the tag-metadata content type following CONTENTFUL_SETUP_DETAILED.md'
      });
    }
    
    // Test 2: Check for specific tag IDs that should exist
    const expectedTagIds = [
      'obligatory-prayers',
      'general-prayers', 
      'obligatory-prayers-gu',
      'general-prayers-gu',
      'generalPrayers',
      'theObligatoryPrayers'
    ];
    
    console.log(`\n=== Checking for expected tag IDs ===`);
    
    const results = [];
    
    for (const tagId of expectedTagIds) {
      try {
        const entries = await client.getEntries({
          content_type: 'tag-metadata',
          locale: langCode === 'en' ? 'en-US' : langCode,
          'fields.tagId': tagId
        });
        
        if (entries.items.length > 0) {
          const entry = entries.items[0];
          const displayName = entry.fields.displayName;
          
          console.log(`✅ ${tagId}: "${displayName}"`);
          results.push({
            tagId,
            found: true,
            displayName,
            status: 'success'
          });
        } else {
          console.log(`❌ ${tagId}: Not found`);
          results.push({
            tagId,
            found: false,
            displayName: null,
            status: 'missing'
          });
        }
      } catch (error) {
        console.log(`❌ ${tagId}: Error - ${error instanceof Error ? error.message : 'Unknown error'}`);
        results.push({
          tagId,
          found: false,
          displayName: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Test 3: Test localization
    console.log(`\n=== Testing localization ===`);
    
    const localizationTest = [];
    const testTagId = 'obligatory-prayers';
    
    for (const locale of ['en-US', 'hi', 'gu']) {
      try {
        const entries = await client.getEntries({
          content_type: 'tag-metadata',
          locale: locale,
          'fields.tagId': testTagId
        });
        
        if (entries.items.length > 0) {
          const displayName = entries.items[0].fields.displayName;
          console.log(`✅ ${locale}: "${displayName}"`);
          localizationTest.push({
            locale,
            displayName,
            status: 'success'
          });
        } else {
          console.log(`❌ ${locale}: No entry found`);
          localizationTest.push({
            locale,
            displayName: null,
            status: 'missing'
          });
        }
      } catch (error) {
        console.log(`❌ ${locale}: Error`);
        localizationTest.push({
          locale,
          displayName: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Summary
    const foundCount = results.filter(r => r.found).length;
    const missingCount = results.filter(r => !r.found).length;
    const allLocalesWork = localizationTest.every(l => l.status === 'success');
    
    const isFullySetup = foundCount === expectedTagIds.length && allLocalesWork;
    
    console.log(`\n=== Summary ===`);
    console.log(`Found: ${foundCount}/${expectedTagIds.length} expected tag IDs`);
    console.log(`Localization: ${allLocalesWork ? 'Working' : 'Issues found'}`);
    console.log(`Status: ${isFullySetup ? 'Fully configured' : 'Setup incomplete'}`);
    
    return res.status(200).json({
      success: isFullySetup,
      language: langCode,
      summary: {
        foundTags: foundCount,
        totalExpected: expectedTagIds.length,
        localizationWorking: allLocalesWork,
        isFullySetup
      },
      tagResults: results,
      localizationTest,
      message: isFullySetup 
        ? 'tag-metadata setup is complete and working!' 
        : 'tag-metadata setup is incomplete',
      nextSteps: isFullySetup 
        ? 'Your tag localization should now work dynamically from Contentful'
        : 'Follow CONTENTFUL_SETUP_DETAILED.md to complete the setup'
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      instructions: 'Check your Contentful credentials and setup'
    });
  }
}
