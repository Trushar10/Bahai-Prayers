const withPWA = require('next-pwa')({
  dest: 'public', // where the final SW goes
  register: true,
  skipWaiting: true,
  swSrc: 'service-worker/sw.js', // source location (not in public)
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
});
