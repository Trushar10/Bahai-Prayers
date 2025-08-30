const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  // Exclude problematic files from precaching
  buildExcludes: [
    /app-build-manifest\.json$/,
    /_buildManifest\.js$/,
    /_ssgManifest\.js$/,
    /dynamic-css-manifest\.json$/
  ],
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
