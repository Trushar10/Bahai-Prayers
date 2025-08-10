/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import {
	CacheFirst,
	NetworkFirst,
	StaleWhileRevalidate,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// ✅ This must stay exactly like this for next-pwa injectManifest
precacheAndRoute(self.__WB_MANIFEST);

// HTML pages (offline-first)
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: 'pages-cache',
		networkTimeoutSeconds: 2,
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 30 * 24 * 60 * 60,
			}),
		],
	})
);

// Contentful API
registerRoute(
	({ url }) => url.origin === 'https://cdn.contentful.com',
	new StaleWhileRevalidate({
		cacheName: 'contentful-api-cache',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 24 * 60 * 60,
			}),
		],
	})
);

// Next.js API
registerRoute(
	({ url }) =>
		url.origin === self.location.origin &&
		(url.pathname.startsWith('/api/prayers') ||
			url.pathname.startsWith('/api/prayer/')),
	new NetworkFirst({
		cacheName: 'next-api-cache',
		networkTimeoutSeconds: 3,
		plugins: [
			new ExpirationPlugin({
				maxEntries: 50,
				maxAgeSeconds: 24 * 60 * 60,
			}),
		],
	})
);

// Static assets
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

// CSS/JS
registerRoute(
	/\.(?:js|css)$/,
	new StaleWhileRevalidate({
		cacheName: 'static-resources',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 7 * 24 * 60 * 60,
			}),
		],
	})
);

// Listen for messages from the client
self.addEventListener('message', (event) => {
	if (event.data?.type === 'PRECACHE_PAGES') {
		precachePages(event.data.payload || []);
	}
	if (event.data?.type === 'PRECACHE_API') {
		precacheApiData(event.data.payload || []);
	}
	if (event.data?.type === 'CACHE_PRAYERS_DATA') {
		cachePrayersData(event.data.payload || {});
	}
});

// Pre-cache HTML pages
async function precachePages(pages) {
	const cache = await caches.open('pages-cache');
	const BATCH_SIZE = 5;
	for (let i = 0; i < pages.length; i += BATCH_SIZE) {
		const batch = pages.slice(i, i + BATCH_SIZE);
		await Promise.allSettled(
			batch.map(async (url) => {
				try {
					const res = await fetch(url, {
						credentials: 'same-origin',
						cache: 'default',
					});
					if (res.ok) {
						await cache.put(url, res.clone());
						console.log(`📦 Precached page: ${url}`);
					}
				} catch (err) {
					console.warn(`⚠️ Error caching page ${url}:`, err);
				}
			})
		);
		if (i + BATCH_SIZE < pages.length) {
			await new Promise((res) => setTimeout(res, 50));
		}
	}
	console.log(`✅ Completed pre-caching ${pages.length} pages`);
}

// Pre-cache API data
async function precacheApiData(apiUrls) {
	const cache = await caches.open('next-api-cache');
	const BATCH_SIZE = 5;
	for (let i = 0; i < apiUrls.length; i += BATCH_SIZE) {
		const batch = apiUrls.slice(i, i + BATCH_SIZE);
		await Promise.allSettled(
			batch.map(async (url) => {
				try {
					const res = await fetch(url, {
						credentials: 'same-origin',
					});
					if (res.ok) {
						await cache.put(url, res.clone());
						console.log(`📦 Precached API: ${url}`);
					}
				} catch (err) {
					console.warn(`⚠️ Error caching API ${url}:`, err);
				}
			})
		);
		if (i + BATCH_SIZE < apiUrls.length) {
			await new Promise((res) => setTimeout(res, 50));
		}
	}
	console.log(`✅ Completed pre-caching ${apiUrls.length} API entries`);
}

// Cache prayers in IndexedDB
async function cachePrayersData(prayersData) {
	try {
		const request = indexedDB.open('PrayersDB', 1);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains('prayers')) {
				db.createObjectStore('prayers', { keyPath: 'id' });
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			const tx = db.transaction(['prayers'], 'readwrite');
			const store = tx.objectStore('prayers');
			store.clear();
			Object.entries(prayersData).forEach(([slug, prayer]) => {
				store.put({ ...prayer, id: slug });
			});
		};
	} catch (err) {
		console.error('❌ IndexedDB not available:', err);
	}
}
