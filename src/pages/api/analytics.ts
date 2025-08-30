import { NextApiRequest, NextApiResponse } from 'next';

interface UserInteraction {
  id: string;
  prayerId: string;
  action: 'view' | 'favorite' | 'share';
  timestamp: number;
  synced: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { interactions } = req.body;

    if (!Array.isArray(interactions)) {
      return res.status(400).json({ error: 'Invalid interactions data' });
    }

    // Here you could log to analytics service, database, etc.
    console.log(`Received ${interactions.length} user interactions:`, 
      interactions.map((i: UserInteraction) => ({
        action: i.action,
        prayerId: i.prayerId,
        timestamp: new Date(i.timestamp).toISOString()
      }))
    );

    // In a real app, you might:
    // - Save to database
    // - Send to analytics service (Google Analytics, Mixpanel, etc.)
    // - Update user preferences
    // - Generate recommendations

    // For now, just acknowledge receipt
    res.status(200).json({ 
      success: true,
      processed: interactions.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Analytics API Error:', error);
    res.status(500).json({ error: 'Failed to process interactions' });
  }
}
