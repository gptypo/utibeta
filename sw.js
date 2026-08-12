'use strict';

var VERSION = 'core-pwa-1.0';
var STATIC_CACHE = 'utiterv-static-' + VERSION;
var RUNTIME_CACHE = 'utiterv-runtime-' + VERSION;
var APP_SHELL = '/index.html';
var OFFLINE_URL = '/offline.html';

var APP_FILES = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/css/app.css', '/css/foundation.css', '/css/pwa.css', '/css/theme.css', '/css/color-system.css',
  '/js/app.js', '/js/pwa.js', '/js/theme.js', '/js/content-state.js', '/js/content-fetch-bridge.js', '/js/content-bootstrap.js',
  '/js/full-content-engine.js', '/js/content-engine.js', '/js/project-content.js', '/js/onmagam.js', '/js/helyzeteim.js', '/js/kapcsolataim.js', '/js/bonus.js',
  '/content/content.json', '/content/project.json', '/content/home.json', '/content/custom/topics.json',
  '/content/shared/competencies.json', '/content/shared/onmagam-data.json',
  '/content/modules/galaxy-guide/index.json', '/content/modules/galaxy-guide/materials.json', '/content/modules/galaxy-guide/videos.json',
  '/content/modules/quick-win/index.json', '/content/modules/quick-win/cv.json', '/content/modules/quick-win/firstday.json', '/content/modules/quick-win/interview.json', '/content/modules/quick-win/jobhunt.json', '/content/modules/quick-win/legal.json', '/content/modules/quick-win/linkedin.json', '/content/modules/quick-win/redflags.json', '/content/modules/quick-win/scenarios.json', '/content/modules/quick-win/world.json',
  '/content/modules/quit-go/index.json', '/content/modules/quit-go/breathing.json', '/content/modules/quit-go/careers.json', '/content/modules/quit-go/marketfacts.json', '/content/modules/quit-go/mindfulness.json', '/content/modules/quit-go/preboarding.json', '/content/modules/quit-go/quiz.json', '/content/modules/quit-go/survival.json',
  '/content/modules/win-win/index.json', '/content/modules/win-win/communication.json', '/content/modules/win-win/digital.json', '/content/modules/win-win/generations.json', '/content/modules/win-win/glossary.json', '/content/modules/win-win/phrases.json', '/content/modules/win-win/twosides.json',
  '/audio/vizualizacio-biztonsagos-hely.mp3',
  '/assets/icons/app-icon-192.png', '/assets/icons/app-icon-512.png', '/assets/icons/app-icon-maskable-512.png', '/assets/icons/apple-touch-icon.png', '/assets/icons/favicon-32.png',
  '/assets/SVG_ASSETS/LOGO/LOGO_CON.svg', '/assets/SVG_ASSETS/LOGO/LOGO_CONTAINER.svg', '/assets/SVG_ASSETS/LOGO/LOGO_CON_v2.svg', '/assets/SVG_ASSETS/LOGO/LOGO_PINPOINT_CON.svg', '/assets/SVG_ASSETS/LOGO/LOGO_ROCKET_CON.svg', '/assets/SVG_ASSETS/LOGO/LOGO_TIPO.svg',
  '/assets/SVG_ASSETS/SML_CONS/GG_SMALL_ICON.svg', '/assets/SVG_ASSETS/SML_CONS/QG_SMALL_ICON.svg', '/assets/SVG_ASSETS/SML_CONS/QW_SMALL_ICON.svg', '/assets/SVG_ASSETS/SML_CONS/WW_SMALL_ICON.svg',
  '/assets/SVG_ASSETS/BIG_CONS/GG_BIG_ICON.svg', '/assets/SVG_ASSETS/BIG_CONS/GG_BIG_ICON_thin.svg', '/assets/SVG_ASSETS/BIG_CONS/QG_BIG_ICON.svg', '/assets/SVG_ASSETS/BIG_CONS/QG_BIG_ICON_thin.svg', '/assets/SVG_ASSETS/BIG_CONS/QW_BIG_ICON.svg', '/assets/SVG_ASSETS/BIG_CONS/QW_BIG_ICON_thin.svg', '/assets/SVG_ASSETS/BIG_CONS/WW_BIG_ICON.svg', '/assets/SVG_ASSETS/BIG_CONS/WW_BIG_ICON_thin.svg',
  '/assets/SVG_ASSETS/INTRO/SKY_ROCKET.svg', '/assets/SVG_ASSETS/INTRO/hero_bottom.svg', '/assets/SVG_ASSETS/INTRO/rocket_background.svg', '/assets/SVG_ASSETS/INTRO/rocket_big.svg', '/assets/SVG_ASSETS/INTRO/rocket_big_background.svg', '/assets/SVG_ASSETS/INTRO/sky_rocket_background.svg', '/assets/SVG_ASSETS/INTRO/sky_rocket_hero_bottom.svg', '/assets/SVG_ASSETS/INTRO/sky_rocket_ship.svg', '/assets/SVG_ASSETS/INTRO/white_cloud.svg', '/assets/SVG_ASSETS/INTRO/white_cloud_center.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(STATIC_CACHE).then(function (cache) {
    return Promise.all(APP_FILES.map(function (url) {
      return fetch(url, {cache:'reload'}).then(function (r) {
        if (!r.ok) throw new Error('Precache failed: ' + url);
        return cache.put(url, r.clone());
      });
    }));
  }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(key){
      return key.indexOf('utiterv-')===0 && key!==STATIC_CACHE && key!==RUNTIME_CACHE ? caches.delete(key) : Promise.resolve(false);
    }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('message', function(event){
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function(event){
  var request=event.request;
  if(request.method!=='GET') return;
  var url; try{url=new URL(request.url)}catch(e){return}
  if(url.origin!==self.location.origin) return;
  if(request.mode==='navigate'){
    event.respondWith(caches.match(APP_SHELL,{ignoreSearch:true}).then(function(cached){
      return cached || fetch(request).catch(function(){return caches.match(OFFLINE_URL,{ignoreSearch:true})});
    }));
    return;
  }
  event.respondWith(caches.match(request,{ignoreSearch:true}).then(function(cached){
    if(cached) return cached;
    return fetch(request).then(function(response){
      if(response && response.ok){var copy=response.clone();caches.open(RUNTIME_CACHE).then(function(cache){cache.put(request,copy)});}
      return response;
    });
  }));
});
