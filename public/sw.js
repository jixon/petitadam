
const CACHE_NAME = 'petit-adam-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/images/petit-adam-logo.png',
  '/sounds/cash-register.mp3',
  '/data/sentences.json'
  // Les fichiers CSS et JS de Next.js sont généralement versionnés avec des hashes,
  // une mise en cache plus avancée (ex: avec Workbox) serait nécessaire pour les gérer de manière robuste.
  // Pour l'instant, on se concentre sur les assets statiques principaux.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache app shell', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  // Supprimer les anciens caches s'il y en a
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes non-GET ou vers /_next/static/development/ (HMR)
  if (event.request.method !== 'GET' || event.request.url.includes('/_next/static/development/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Pas dans le cache, donc requête réseau
        return fetch(event.request).then(
          (networkResponse) => {
            // Vérifier si nous avons reçu une réponse valide
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Important: Cloner la réponse. Une réponse est un flux et ne peut être consommée qu'une seule fois.
            // Nous devons cloner pour en mettre une copie dans le cache et une autre pour le navigateur.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(() => {
        // Si la requête réseau échoue aussi (ex: hors ligne), 
        // et que la ressource n'est pas dans le cache, on pourrait retourner une page hors-ligne générique.
        // Pour l'instant, on laisse l'erreur se propager.
        console.warn('Service Worker: Fetch failed for', event.request.url);
        // Optionnel: retourner une page fallback offline si /offline.html est mis en cache.
        // return caches.match('/offline.html'); 
      })
  );
});
