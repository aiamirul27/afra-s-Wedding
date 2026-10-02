// Afra & Asrar's wedding app — service worker
// Caches the app shell so the page can install and open instantly / offline.
// Live data (the Google Sheet via Apps Script) always goes straight to the
// network — it is never cached, so guests and RSVPs are always fresh when online.

var CACHE_NAME = 'afra-asrar-wedding-v1';
var SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Never touch calls to the Apps Script backend or Google APIs — always live.
  if (url.indexOf('script.google.com') !== -1 ||
      url.indexOf('googleusercontent.com') !== -1 ||
      url.indexOf('googleapis.com') !== -1 ||
      url.indexOf('accounts.google.com') !== -1) {
    return;
  }

  if (event.request.method !== 'GET') return;

  // App shell & fonts: try cache first, update cache in background, fall back to network.
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      var fetchPromise = fetch(event.request).then(function (networkResponse) {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(function () {
        return cached;
      });
      return cached || fetchPromise;
    })
  );
});
