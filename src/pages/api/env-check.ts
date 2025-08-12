import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check environment variables (without exposing sensitive values)
  const envCheck = {
    CONTENTFUL_SPACE_ID: !!process.env.CONTENTFUL_SPACE_ID,
    CONTENTFUL_ACCESS_TOKEN: !!process.env.CONTENTFUL_ACCESS_TOKEN,
    CONTENTFUL_MANAGEMENT_TOKEN: !!process.env.CONTENTFUL_MANAGEMENT_TOKEN,
    NODE_ENV: process.env.NODE_ENV,
    // Show first few characters of space ID for verification
    spaceIdPrefix: process.env.CONTENTFUL_SPACE_ID?.substring(0, 4) + '...',
  };

  res.status(200).json(envCheck);
}
