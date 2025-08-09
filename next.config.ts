const withPWA = require('next-pwa')({
  dest: 'public',
  swSrc: 'sw.js', // our custom service worker
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  reactStrictMode: true,
});
