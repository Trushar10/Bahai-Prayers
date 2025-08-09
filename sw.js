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

// Cache HTML pages with improved offline-first strategy
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: 'pages-cache',
		networkTimeoutSeconds: 2, // Reduced timeout for faster offline fallback
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100, // Increased for more prayers
				maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
			}),
		],
	})
);

// Cache API responses from Contentful
registerRoute(
	({ url }) => url.origin === 'https://cdn.contentful.com',
	new StaleWhileRevalidate({
		cacheName: 'contentful-api-cache',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 200,
				maxAgeSeconds: 24 * 60 * 60, // 1 day
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
				maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
			}),
		],
	})
);

// Cache CSS and JS files
registerRoute(
	/\.(?:js|css)$/,
	new StaleWhileRevalidate({
		cacheName: 'static-resources',
		plugins: [
			new ExpirationPlugin({
				maxEntries: 100,
				maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
			}),
		],
	})
);

// Enhanced message handling for comprehensive pre-caching
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'PRECACHE_PAGES') {
		// Pre-cache HTML pages
		const pages = event.data.payload || [];
		precachePages(pages);
	}

	if (event.data && event.data.type === 'CACHE_PRAYERS_DATA') {
		// Store prayer data in IndexedDB via service worker
		const prayersData = event.data.payload || {};
		cachePrayersData(prayersData);
	}
});

// Optimized page pre-caching with batching
async function precachePages(pages) {
	const cache = await caches.open('pages-cache');
	const BATCH_SIZE = 5; // Process in batches to avoid overwhelming the browser

	for (let i = 0; i < pages.length; i += BATCH_SIZE) {
		const batch = pages.slice(i, i + BATCH_SIZE);

		// Process batch concurrently
		await Promise.allSettled(
			batch.map(async (url) => {
				try {
					const response = await fetch(url, {
						credentials: 'same-origin',
						cache: 'default',
					});

					if (response.ok) {
						await cache.put(url, response.clone());
						console.log(`📦 Precached page: ${url}`);
					} else {
						console.warn(
							`⚠️ Failed to cache ${url}: ${response.status}`
						);
					}
				} catch (error) {
					console.warn(`⚠️ Error caching ${url}:`, error);
				}
			})
		);

		// Small delay between batches to prevent blocking
		if (i + BATCH_SIZE < pages.length) {
			await new Promise((resolve) => setTimeout(resolve, 50));
		}
	}

	console.log(`✅ Completed pre-caching ${pages.length} pages`);
}

// Cache prayers data in IndexedDB
async function cachePrayersData(prayersData) {
	try {
		// Use IndexedDB to store structured prayer data
		const request = indexedDB.open('PrayersDB', 1);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains('prayers')) {
				db.createObjectStore('prayers', { keyPath: 'id' });
			}
		};

		request.onsuccess = () => {
			const db = request.result;
			const transaction = db.transaction(['prayers'], 'readwrite');
			const store = transaction.objectStore('prayers');

			// Clear and repopulate
			store.clear();

			Object.entries(prayersData).forEach(([slug, prayerData]) => {
				store.put({ ...prayerData, id: slug });
			});

			transaction.oncomplete = () => {
				console.log(
					`✅ Cached ${
						Object.keys(prayersData).length
					} prayers in IndexedDB`
				);
			};
		};

		request.onerror = (error) => {
			console.error('❌ Error caching prayers data:', error);
		};
	} catch (error) {
		console.error('❌ IndexedDB not available:', error);
	}
}

// Enhanced offline handling
self.addEventListener('fetch', (event) => {
	// Handle prayer page requests when offline
	if (event.request.mode === 'navigate' && event.request.url.includes('/')) {
		event.respondWith(
			fetch(event.request).catch(async () => {
				// If network fails, try to serve from cache
				const cache = await caches.open('pages-cache');
				const cachedResponse = await cache.match(event.request);

				if (cachedResponse) {
					return cachedResponse;
				}

				// If no cached version, serve a basic offline page
				return new Response(
					`
						<!DOCTYPE html>
						<html>
						<head>
							<title>Offline - Prayers</title>
							<meta name="viewport" content="width=device-width, initial-scale=1">
						</head>
						<body>
							<h1>You're offline</h1>
							<p>This page is not available offline. Please check your internet connection and try again.</p>
							<button onclick="history.back()">Go Back</button>
						</body>
						</html>
					`,
					{
						headers: { 'Content-Type': 'text/html' },
					}
				);
			})
		);
	}
});
