// Daybook Service Worker — Network-First for dynamic updates, offline fallback
const CACHE_NAME = 'daybook-cache-v5';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/login',
  '/login.html',
  '/signup',
  '/signup.html',
  '/onboarding',
  '/onboarding.html',
  '/app',
  '/app.html',
  '/app/schedule',
  '/app/schedule.html',
  '/app/tasks',
  '/app/tasks.html',
  '/app/insights',
  '/app/insights.html',
  '/app/settings',
  '/app/settings.html',
  '/assets/favicon.svg',
  '/assets/css/tokens.css',
  '/assets/css/base.css',
  '/assets/css/app.css',
  '/assets/css/landing.css',
  '/assets/css/auth.css',
  '/assets/js/icons.js',
  '/assets/js/store.js',
  '/assets/js/ui.js',
  '/assets/js/shell.js',
  '/assets/js/landing.js',
  '/assets/js/auth-config.js',
  '/assets/js/auth.js',
  '/assets/js/onboarding.js',
  '/assets/js/pages/today.js',
  '/assets/js/pages/schedule.js',
  '/assets/js/pages/tasks.js',
  '/assets/js/pages/insights.js',
  '/assets/js/pages/settings.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: 'reload' })))
    ).catch(() => {})
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

  // Network-first: Always attempt fresh network fetch so user gets latest code immediately
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          const url = new URL(event.request.url);
          if (url.pathname.startsWith('/app')) return caches.match('/app') || caches.match('/app.html');
          if (url.pathname === '/login') return caches.match('/login') || caches.match('/login.html');
          if (url.pathname === '/signup') return caches.match('/signup') || caches.match('/signup.html');
          return caches.match('/') || caches.match('/index.html');
        })
      )
  );
});
