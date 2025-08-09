importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js'
);

if (workbox) {
	console.log('✅ Service Worker loaded with Workbox');

	self.skipWaiting();
	workbox.core.clientsClaim();

	// Injected by next-pwa at build time
	workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

	// Cache HTML pages
	workbox.routing.registerRoute(
		({ request }) => request.mode === 'navigate',
		new workbox.strategies.StaleWhileRevalidate({
			cacheName: 'html-cache',
			plugins: [
				new workbox.expiration.ExpirationPlugin({
					maxAgeSeconds: 31536000,
				}),
			],
		})
	);

	// Cache Contentful API responses
	workbox.routing.registerRoute(
		/^https:\/\/cdn\.contentful\.com\/.*/i,
		new workbox.strategies.StaleWhileRevalidate({
			cacheName: 'content-cache',
			plugins: [
				new workbox.expiration.ExpirationPlugin({
					maxAgeSeconds: 31536000,
				}),
			],
		})
	);

	// Cache static assets
	workbox.routing.registerRoute(
		/\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)$/,
		new workbox.strategies.CacheFirst({
			cacheName: 'asset-cache',
			plugins: [
				new workbox.expiration.ExpirationPlugin({
					maxEntries: 200,
					maxAgeSeconds: 31536000,
				}),
			],
		})
	);
} else {
	console.log('❌ Workbox failed to load');
}
