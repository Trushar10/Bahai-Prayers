// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/, // Cache all network requests
      handler: 'NetworkFirst', // For HTML pages: always try network first
      options: {
        cacheName: 'html-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?|ttf|eot)$/,
      handler: 'CacheFirst', // For static assets
      options: {
        cacheName: 'asset-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/cdn\.contentful\.com\/.*/, // Cache your Contentful API responses
      handler: 'CacheFirst',
      options: {
        cacheName: 'content-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
})

module.exports = withPWA({
  reactStrictMode: true,
})
