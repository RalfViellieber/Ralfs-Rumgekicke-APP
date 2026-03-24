// für PWA
const CACHE_NAME = 'viellieber-eu-cache-fb-v4';
const urlsToCache = [
  './',
  './soccer.html',
  './class_SoccerGame.js',
  './motioncontrol.js',
  './constants.js',
  './gameOptions.js',
  './spieler.js',
  './site.webmanifest',
  './anleitung.html',
  './anleitung_mobile.html',
  'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js',
  './favicon.ico',
  './img/apple-touch-icon.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/rasen.jpg',
  './img/ball.gif',
  './img/tor_l.gif',
  './img/tor_r.gif',
  './img/germany-flag.png',
  './img/united-kingdom-flag.png',
  './sounds/anpfiff.mp3',
  './sounds/tor.mp3',
  './sounds/abzug.mp3',
  './sounds/kulisse.mp3'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
      )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});