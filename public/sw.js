// Basic service worker for PWA caching

const CACHE_NAME = 'petit-adam-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  // Add paths to your main CSS, JS, and critical image assets here
  // Example: '/styles/globals.css', '/images/petit-adam-logo.png'
  // For Next.js, many assets are fingerprinted, so dynamic caching might be better
  // This basic example will cache the main page and manifest.
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event in progress.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        // Add files that are part of the app shell.
        // Be careful with Next.js specific hashed files if adding them here.
        return cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('Service Worker: Install completed');
      })
      .catch((error) => {
        console.error('Service Worker: Install failed:', error);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // console.log('Service Worker: Fetch event for ', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          // console.log('Service Worker: Found ', event.request.url, ' in cache');
          return response;
        }
        // console.log('Service Worker: Network request for ', event.request.url);
        return fetch(event.request).then((response) => {
          // Optional: Caching new requests dynamically
          // if (!response || response.status !== 200 || response.type !== 'basic') {
          //   return response;
          // }
          // const responseToCache = response.clone();
          // caches.open(CACHE_NAME)
          //   .then((cache) => {
          //     cache.put(event.request, responseToCache);
          //   });
          return response;
        });
      }).catch(error => {
        console.error('Service Worker: Fetch failed; returning offline page instead.', error);
        // Optionally, return a fallback offline page
        // return caches.match('/offline.html');
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event in progress.');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          // Return true if you want to remove this cache,
          // but we'll keep it simple and not remove caches in this example.
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          console.log('Service Worker: Removing old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: Activate completed.');
      return self.clients.claim();
    })
  );
});
