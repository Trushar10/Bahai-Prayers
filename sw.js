// sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST || []);

// Cache HTML pages (including posts)
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: 'pages-cache',
		networkTimeoutSeconds: 3,
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 30 * 24 * 60 * 60,
			}),
		],
	})
);

// Cache static assets
registerRoute(
	/\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|eot)$/,
	new CacheFirst({
		cacheName: 'asset-cache',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 365 * 24 * 60 * 60,
			}),
		],
	})
);

// Handle PRECACHE_PAGES message from app
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'PRECACHE_PAGES') {
		(event.data.payload || []).forEach((url) => {
			fetch(url).then((res) => {
				if (res.ok) {
					caches.open('pages-cache').then((cache) => {
						cache.put(url, res.clone());
						console.log(`📦 Precached: ${url}`);
					});
				}
			});
		});
	}
});
