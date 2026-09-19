// Daybook Service Worker — offline caching & instant launch
const CACHE_NAME = 'daybook-cache-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './login.html',
  './signup.html',
  './onboarding.html',
  './app/index.html',
  './app/schedule.html',
  './app/tasks.html',
  './app/insights.html',
  './app/settings.html',
  './assets/favicon.svg',
  './assets/css/tokens.css',
  './assets/css/base.css',
  './assets/css/app.css',
  './assets/css/landing.css',
  './assets/css/auth.css',
  './assets/js/icons.js',
  './assets/js/store.js',
  './assets/js/ui.js',
  './assets/js/shell.js',
  './assets/js/landing.js',
  './assets/js/auth.js',
  './assets/js/onboarding.js',
  './assets/js/pages/today.js',
  './assets/js/pages/schedule.js',
  './assets/js/pages/tasks.js',
  './assets/js/pages/insights.js',
  './assets/js/pages/settings.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networked;
    })
  );
});
