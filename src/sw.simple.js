import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';

// Precache files
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache API calls
registerRoute(
	({ url }) => url.pathname.startsWith('/api/'),
	new CacheFirst({
		cacheName: 'api-cache',
	})
);

// Cache pages
registerRoute(
	({ request }) => request.mode === 'navigate',
	new NetworkFirst({
		cacheName: 'pages-cache',
	})
);

self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', () => {
	self.clients.claim();
});
