importScripts(
	'https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js'
);

if (workbox) {
	console.log('✅ Service Worker loaded with Workbox');

	self.skipWaiting();
	workbox.core.clientsClaim();

	// Injected by next-pwa at build time
	workbox.precaching.precacheAndRoute(self.__WB_MANIFEST || []);

	// Custom logic to precache post pages
	self.addEventListener('install', (event) => {
		event.waitUntil(
			(async () => {
				try {
					// Fetch all slugs from your Contentful API
					const res = await fetch(
						'https://cdn.contentful.com/.../entries?content_type=prayer-eng&select=fields.slug&access_token=YOUR_ACCESS_TOKEN'
					);
					const data = await res.json();
					const urls = data.items.map(
						(item) => `/${item.fields.slug}`
					);

					const cache = await caches.open('html-cache');
					await cache.addAll(urls);
					console.log('📦 Precached all posts:', urls);
				} catch (err) {
					console.error('❌ Failed to precache posts', err);
				}
			})()
		);
	});

	// Runtime caching rules (kept from before)
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
