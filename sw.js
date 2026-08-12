'use strict';

var VERSION = 'beta-3.2.1-netlify-hotfix';
var STATIC_CACHE = 'utiterv-static-' + VERSION;
var RUNTIME_CACHE = 'utiterv-runtime-' + VERSION;
var APP_SHELL = '/index.html';
var OFFLINE_URL = '/offline.html';

// Complete application dependency graph required by index.html and its ES modules.
// Keeping this explicit makes missing offline dependencies visible during review.
var APP_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/agent.html',
  '/css/agent.css',
  '/js/agent.js',
  '/manifest.webmanifest?v=beta-1.2.6-samsung-install-guard',
  '/manifest.json?v=beta-1.2.6-samsung-install-guard',
  '/css/app.css',
  '/css/foundation.css',
  '/css/pwa.css',
  '/css/theme.css',
  '/css/color-system.css',
  '/js/app.js',
  '/js/pwa.js',
  '/js/theme.js',
  '/js/studio-runtime.js',
  '/js/studio-engine.js',
  '/js/full-content-engine.js',
  '/js/content-engine.js',
  '/js/project-content.js',
  '/js/onmagam.js',
  '/js/onmagam-data.js',
  '/js/helyzeteim.js',
  '/js/kapcsolataim.js',
  '/js/bonus.js',
  '/js/competencies.js',
  '/content/project.json',
  '/content/home.json',
  '/assets/icons/app-icon-192.png?v=beta-1.2.5-career-competency-polish',
  '/assets/icons/app-icon-512.png?v=beta-1.2.5-career-competency-polish',
  '/assets/icons/app-icon-maskable-512.png?v=beta-1.2.5-career-competency-polish',
  '/assets/icons/apple-touch-icon.png?v=beta-1.2.5-career-competency-polish',
  '/assets/icons/favicon-32.png?v=beta-1.2.5-career-competency-polish',
  '/content/custom/topics.json',
  '/content/modules/galaxy-guide/index.json',
  '/content/modules/galaxy-guide/materials.json',
  '/content/modules/galaxy-guide/videos.json',
  '/content/modules/quick-win/cv.json',
  '/content/modules/quick-win/firstday.json',
  '/content/modules/quick-win/index.json',
  '/content/modules/quick-win/interview.json',
  '/content/modules/quick-win/jobhunt.json',
  '/content/modules/quick-win/legal.json',
  '/content/modules/quick-win/linkedin.json',
  '/content/modules/quick-win/redflags.json',
  '/content/modules/quick-win/scenarios.json',
  '/content/modules/quick-win/world.json',
  '/content/modules/quit-go/breathing.json',
  '/content/modules/quit-go/careers.json',
  '/content/modules/quit-go/index.json',
  '/content/modules/quit-go/marketfacts.json',
  '/content/modules/quit-go/mindfulness.json',
  '/content/modules/quit-go/preboarding.json',
  '/content/modules/quit-go/quiz.json',
  '/content/modules/quit-go/survival.json',
  '/content/modules/win-win/communication.json',
  '/content/modules/win-win/digital.json',
  '/content/modules/win-win/generations.json',
  '/content/modules/win-win/glossary.json',
  '/content/modules/win-win/index.json',
  '/content/modules/win-win/phrases.json',
  '/content/modules/win-win/twosides.json',
  '/content/shared/competencies.json',
  '/content/shared/onmagam-data.json',
  '/audio/vizualizacio-biztonsagos-hely.mp3',
  '/assets/SVG_ASSETS/LOGO/LOGO_CON.svg',
  '/assets/SVG_ASSETS/LOGO/LOGO_CONTAINER.svg',
  '/assets/SVG_ASSETS/LOGO/LOGO_CON_v2.svg',
  '/assets/SVG_ASSETS/LOGO/LOGO_PINPOINT_CON.svg',
  '/assets/SVG_ASSETS/LOGO/LOGO_ROCKET_CON.svg',
  '/assets/SVG_ASSETS/LOGO/LOGO_TIPO.svg',
  '/assets/SVG_ASSETS/SML_CONS/GG_SMALL_ICON.svg',
  '/assets/SVG_ASSETS/SML_CONS/QG_SMALL_ICON.svg',
  '/assets/SVG_ASSETS/SML_CONS/QW_SMALL_ICON.svg',
  '/assets/SVG_ASSETS/SML_CONS/WW_SMALL_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/GG_BIG_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/GG_BIG_ICON_thin.svg',
  '/assets/SVG_ASSETS/BIG_CONS/QG_BIG_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/QG_BIG_ICON_thin.svg',
  '/assets/SVG_ASSETS/BIG_CONS/QW_BIG_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/QW_BIG_ICON_thin.svg',
  '/assets/SVG_ASSETS/BIG_CONS/WW_BIG_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/WW_BIG_ICON_thin.svg',
  '/assets/SVG_ASSETS/INTRO/SKY_ROCKET.svg',
  '/assets/SVG_ASSETS/INTRO/hero_bottom.svg',
  '/assets/SVG_ASSETS/INTRO/rocket_background.svg',
  '/assets/SVG_ASSETS/INTRO/rocket_big.svg',
  '/assets/SVG_ASSETS/INTRO/rocket_big_background.svg',
  '/assets/SVG_ASSETS/INTRO/sky_rocket_background.svg',
  '/assets/SVG_ASSETS/INTRO/sky_rocket_hero_bottom.svg',
  '/assets/SVG_ASSETS/INTRO/sky_rocket_ship.svg',
  '/assets/SVG_ASSETS/INTRO/white_cloud.svg',
  '/assets/SVG_ASSETS/INTRO/white_cloud_center.svg'
];

function fetchAndCache(cache, url) {
  return fetch(url, { cache: 'reload' }).then(function (response) {
    if (!response || !response.ok) {
      throw new Error('Precache failed: ' + url + ' (' + (response ? response.status : 'no response') + ')');
    }
    return cache.put(url, response.clone());
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function (cache) {
        return Promise.all(APP_FILES.map(function (url) {
          return fetchAndCache(cache, url);
        }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key.indexOf('utiterv-') === 0 && key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function cachedAppShell() {
  return caches.match(APP_SHELL, { ignoreSearch: true }).then(function (response) {
    if (response) return response;
    return caches.match('/', { ignoreSearch: true });
  }).then(function (response) {
    if (response) return response;
    return caches.match(OFFLINE_URL, { ignoreSearch: true });
  });
}

function navigationResponse(request) {
  // The installed PWA must start from the same cached shell even when its
  // start_url contains ?source=pwa or a hash route.
  return caches.match(request, { ignoreSearch: true }).then(function (cached) {
    if (cached) return cached;
    return cachedAppShell();
  }).then(function (cachedShell) {
    if (cachedShell) return cachedShell;
    return fetch(request);
  });
}

function staticResponse(request) {
  return caches.match(request, { ignoreSearch: true }).then(function (cached) {
    if (cached) return cached;
    return fetch(request).then(function (response) {
      if (!response || !response.ok) return response;
      var copy = response.clone();
      caches.open(RUNTIME_CACHE).then(function (cache) {
        cache.put(request, copy);
      });
      return response;
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try { url = new URL(request.url); } catch (error) { return; }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigationResponse(request));
    return;
  }

  event.respondWith(staticResponse(request));
});
