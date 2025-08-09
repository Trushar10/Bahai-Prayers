// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'html-cache',
        expiration: { maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
  ],
})

module.exports = withPWA({
  reactStrictMode: true,
})
