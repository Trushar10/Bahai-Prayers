const withPWA = require('next-pwa')({
  dest: 'public',
  register: false, // Disable automatic registration
  skipWaiting: true,
  disable: true, // Temporarily disable PWA
  swSrc: 'src/sw.js',
  swDest: 'public/sw.js',
  fallbacks: {
    document: '/offline',
  },
});

module.exports = withPWA({
  reactStrictMode: true,
  images: {
    domains: ['images.ctfassets.net'],
  },
});
