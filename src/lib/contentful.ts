import { createClient } from 'contentful'

// Create client only on server side
let contentfulClient: ReturnType<typeof createClient> | null = null

export const getClient = () => {
  // Only create client on server side
  if (typeof window !== 'undefined') {
    throw new Error('Contentful client should only be used server-side')
  }

  if (!contentfulClient) {
    // Validate required environment variables
    if (!process.env.CONTENTFUL_SPACE_ID) {
      throw new Error('CONTENTFUL_SPACE_ID environment variable is required')
    }

    if (!process.env.CONTENTFUL_ACCESS_TOKEN) {
      throw new Error('CONTENTFUL_ACCESS_TOKEN environment variable is required')
    }

    contentfulClient = createClient({
      space: process.env.CONTENTFUL_SPACE_ID,
      accessToken: process.env.CONTENTFUL_ACCESS_TOKEN
    })
  }

  return contentfulClient
}

// For backward compatibility, export a client that only works server-side
export const client = new Proxy({} as ReturnType<typeof createClient>, {
  get(target, prop) {
    const actualClient = getClient()
    return actualClient[prop as keyof typeof actualClient]
  }
})
