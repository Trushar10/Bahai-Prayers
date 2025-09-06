// PWA configuration - now working after folder rename
// Folder renamed from "Bahá'í Prayers" to "Bahai-Prayers" to fix workbox issues
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline.html'
  },
  // Fix workbox precaching issues
  buildExcludes: [/middleware-manifest\.json$/, /build-manifest\.json$/, /dynamic-css-manifest\.json$/],
  // Simplified runtime caching
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/cdn\.contentful\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'contentful-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
        }
      },
    },
    {
      urlPattern: /\/api\/prayers/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'prayers-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 5 * 60, // 5 minutes
        }
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }
      },
    }
  ]
})

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
}

module.exports = withPWA(nextConfig)
