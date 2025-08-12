import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Check environment variables (without exposing sensitive values)
    const envCheck = {
      CONTENTFUL_SPACE_ID: !!process.env.CONTENTFUL_SPACE_ID,
      CONTENTFUL_ACCESS_TOKEN: !!process.env.CONTENTFUL_ACCESS_TOKEN,
      CONTENTFUL_MANAGEMENT_TOKEN: !!process.env.CONTENTFUL_MANAGEMENT_TOKEN,
      NODE_ENV: process.env.NODE_ENV,
      // Show first few characters of space ID for verification
      spaceIdPrefix: process.env.CONTENTFUL_SPACE_ID?.substring(0, 4) + '...',
    };

    // Test the prayers API to see what we get
    const prayersRes = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/prayers?lang=en`);
    const prayersData = await prayersRes.json();
    
    const debugInfo = {
      environment: envCheck,
      prayersAPI: {
        status: prayersRes.status,
        itemsCount: prayersData.items?.length || 0,
        tagsCount: prayersData.tags?.length || 0,
        sampleTags: prayersData.tags?.slice(0, 3) || [],
        hasError: !!prayersData.error
      }
    };

    res.status(200).json(debugInfo);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check environment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
