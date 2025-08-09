// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public', // Required output folder for SW
  register: true, // Auto register SW
  skipWaiting: true, // Activate new SW immediately
  swSrc: 'public/sw.js', // Custom service worker file
  disable: process.env.NODE_ENV === 'development', // Disable in dev
});

module.exports = withPWA({
  reactStrictMode: true,
});
