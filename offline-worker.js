/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */


(function (self) {
  'use strict';

  // On install, cache resources and skip waiting so the worker won't
  // wait for clients to be closed before becoming active.
  self.addEventListener('install', function (event) {
    event.waitUntil(oghliner.cacheResources().then(function () {
      return self.skipWaiting();
    }));
  });

  // On activation, delete old caches and start controlling the clients
  // without waiting for them to reload.
  self.addEventListener('activate', function (event) {
    event.waitUntil(oghliner.clearOtherCaches().then(function () {
      return self.clients.claim();
    }));
  });

  // Retrieves the request following oghliner strategy.
  self.addEventListener('fetch', function (event) {
    if (event.request.method === 'GET') {
      event.respondWith(oghliner.get(event.request));
    } else {
      event.respondWith(self.fetch(event.request));
    }
  });

  var oghliner = self.oghliner = {

    // This is the unique prefix for all the caches controlled by this worker.
    CACHE_PREFIX: 'offline-cache:wfwalker/opensun:' + (self.registration ? self.registration.scope : '') + ':',

    // This is the unique name for the cache controlled by this version of the worker.
    get CACHE_NAME() {
      return this.CACHE_PREFIX + '824b1ba294bd5742684391537f48d4abcbf45916';
    },

    // This is a list of resources that will be cached.
    RESOURCES: [
      './', // cache always the current root to make the default page available
      './css/app.css', // 5843f82d173782494c78c04c29ab5d7a8f528881
      './css/app2.css', // da5e3ac02fcbde82aecc917d6f837f21734a1826
      './css/brick-1.0.1.css', // 83d6cd80a74436faab4fd95bc2b59638013da3b9
      './css/qunit.css', // 1cf8b4bfff4b27bfdff531b3f51a34ba1bc7c236
      './css/sticky-footer-navbar.css', // b9c32ded3bc22a761f626ba91252bde5f3c8405a
      './img/buttons-annotated.png', // 64c0ec87a2b0b5b65ef29f1311b1df471090e236
      './img/buttons.png', // 4c45c17f1f2f1506d4125286ee3084b724c60bf7
      './img/doohickey-annotated.png', // 6b4916c54fe51c23a0b2f6054a438da4f033c2f3
      './img/doohickey.png', // e8696cd450807c635881c1d46c75a57adbf10662
      './img/glyphicons-halflings-white.png', // a25c4705320fd63c33790e666872910e702b9bf6
      './img/glyphicons-halflings.png', // 5f8440da149709940c6bb72ff544b5abba7e8ab4
      './img/place-menu.png', // bf6390e41627ec824351a050d636c83ae70a9285
      './img/shotclock-logo-128.png', // 7e5795c4aa49f32733ac706e9f90060e33ba87a2
      './img/shotclock-logo-144.gif', // 7aa394721e2c568cc45721e3481948c3fd996f65
      './img/shotclock-logo-64.png', // 89c466692e3a03159983d341a83b4a5685b99f1b
      './img/shotclock.png', // d1609dec25b09e7e570d3ee9e4a2fb96a9120148
      './img/small-progress.gif', // 9d8f230d5e14ff93c7523804faca71e5f46180d1
      './img/splashscreen.png', // 714a1c4a18de38d9a5565da8083c48430b291997
      './img/time-menu.png', // 15fbe8e43254f7457c07a525905acb9f71a38322
      './js/app.js', // 6f3dbf825e65742bbdbce151e7228dfb2b017cef
      './js/offline-manager.js', // 40bdf40ed1714f16bf388909b40b5bdccaefe569
      './js/shotclock-draw.js', // d069e1eb9f64d897551083db2500825f223f2da6
      './js/tests.js', // 84a12f5762481e028427fb2268f43a0c87396101
      './css/lib/ol.css', // 908395d47d4540e482400362e39cc7358a133fc3
      './js/lib/brick-1.0.1.js', // 67ca1fcd8361f6a6c07cac77cc1333cd38ce5484
      './js/lib/date.js', // 8f4b0b0fa5306722c30a80521530d56d1ee18806
      './js/lib/jquery.js', // 79db35e3a94da9ce724c4d3c8ccc5d1864b23a95
      './js/lib/l10n.js', // 871e33d80d1f04737d6c452ac8566bd49f8b2dd9
      './js/lib/ol.js', // c68ccdcbfd3ec10789c9ccaaff0b20df25402578
      './js/lib/pathseg.js', // 5b87213295f0a107e9d9bda242600db056fc5eb4
      './js/lib/qunit.js', // 0d8fdaeec180bcc70af77f58ca31d99f6bded201
      './js/lib/sun-angle-utils.js', // dbbc2b68d093428de1cbfae8d42361187fb31568
      './index.html', // e0ac7f752159c46eacf390ac7376856e47cdf4fb
      './l10n-data.ini', // 933d99da3d95d8d6bf284cc6c65296d733cc9a57
      './w3c-manifest.json', // 8d6fd3d61195b7cacb2d1e04959a527933fd74fa

    ],

    // Adds the resources to the cache controlled by this worker.
    cacheResources: function () {
      var now = Date.now();
      var baseUrl = self.location;
      return this.prepareCache()
      .then(function (cache) {
        return Promise.all(this.RESOURCES.map(function (resource) {
          // Bust the request to get a fresh response
          var url = new URL(resource, baseUrl);
          var bustParameter = (url.search ? '&' : '') + '__bust=' + now;
          var bustedUrl = new URL(url.toString());
          bustedUrl.search += bustParameter;

          // But cache the response for the original request
          var requestConfig = { credentials: 'same-origin' };
          var originalRequest = new Request(url.toString(), requestConfig);
          var bustedRequest = new Request(bustedUrl.toString(), requestConfig);
          return fetch(bustedRequest).then(function (response) {
            if (response.ok) {
              return cache.put(originalRequest, response);
            }
            console.error('Error fetching ' + url + ', status was ' + response.status);
          });
        }));
      }.bind(this));
    },

    // Remove the offline caches not controlled by this worker.
    clearOtherCaches: function () {
      var deleteIfNotCurrent = function (cacheName) {
        if (cacheName.indexOf(this.CACHE_PREFIX) !== 0 || cacheName === this.CACHE_NAME) {
          return Promise.resolve();
        }
        return self.caches.delete(cacheName);
      }.bind(this);

      return self.caches.keys()
      .then(function (cacheNames) {
        return Promise.all(cacheNames.map(deleteIfNotCurrent));
      });

    },

    // Get a response from the current offline cache or from the network.
    get: function (request) {
      return this.openCache()
      .then(function (cache) {
        return cache.match(request);
      })
      .then(function (response) {
        if (response) {
          return response;
        }
        return self.fetch(request);
      });
    },

    // Prepare the cache for installation, deleting it before if it already exists.
    prepareCache: function () {
      return self.caches.delete(this.CACHE_NAME).then(this.openCache.bind(this));
    },

    // Open and cache the offline cache promise to improve the performance when
    // serving from the offline-cache.
    openCache: function () {
      if (!this._cache) {
        this._cache = self.caches.open(this.CACHE_NAME);
      }
      return this._cache;
    }

  };
}(self));
