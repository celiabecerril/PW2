

const CACHE_NAME = 'peluqueria-pereda41-v2';
const FILES_TO_CACHE = [
  '/',                
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/products.html',
  '/chat.html',
  '/login.html',
  '/register.html'
];


self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Archivos añadidos a caché:', FILES_TO_CACHE);
        return cache.addAll(FILES_TO_CACHE);
      })
  );
  self.skipWaiting();
});


self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Caché antigua eliminada:', key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  event.respondWith(
    fetch(req)
      .then((response) => {

        if (req.method === 'GET' && response && response.ok) {
          try {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, cloned);
            });
          } catch (err) {
            
            console.warn('[SW] no se pudo cachear:', req.method, req.url, err);
          }
        }
        return response;
      })
      .catch(() => {
       
        if (req.method === 'GET') {
          return caches.match(req);
        }
        
        return new Response(JSON.stringify({ message: 'Offline or network error' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
  );
});
