/**
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This generated service worker JavaScript will precache your site's resources.
// The code needs to be saved in a .js file at the top-level of your site, and registered
// from your pages in order to be used. See
// https://github.com/googlechrome/sw-precache/blob/master/demo/app/js/service-worker-registration.js
// for an example of how you can register this script and handle various service worker events.

'use strict';



var PrecacheConfig = [["/css/app.css","c94a451ff392fcec993df43a8d2d5d11"],["/css/app2.css","27ef75fefc0d90a75b2159ed850d84e3"],["/css/brick-0.9.1.css","f2353ae6623ba7b3f4e45f22b0656f28"],["/css/brick-1.0.1.css","b395109cd3a3cd91d96f952c158d4e46"],["/css/lib/bootstrap-responsive.css","e98c249da0438cfc8a2e989094eda458"],["/css/lib/bootstrap-theme.css","e5f6fb08f469dc836cb3609e23694b3a"],["/css/lib/bootstrap-theme.min.css","f0c8fc013c87173a395444fce28cb123"],["/css/lib/bootstrap.css","be665bb9f0f7fc89f515adb828fa0a9b"],["/css/lib/bootstrap.min.css","58a49b3689d699cb72ffda7252d99fcb"],["/css/lib/ol.css","c3241461197fdf96c0fc880842246a63"],["/css/qunit.css","4aa97cc832ce7083504642f66b2a2189"],["/css/sticky-footer-navbar.css","c0a635f95370f51e1269f181d27376a9"],["/favicon.ico","925396f8e04929f252665745a3d33b6f"],["/img/arrow.png","fa83aa71cfebf84f66febbf2f757406f"],["/img/buttons-annotated.png","714554715039c0ccd09d7c067c074333"],["/img/buttons.png","0beb68fb8c11973512a2a73d02c0f20c"],["/img/doohickey-annotated.png","f7ebcb4ebee64892645c996e03f3432e"],["/img/doohickey.png","9542b780c2b8dcbabbf1e08d0ee7d164"],["/img/glyphicons-halflings-white.png","9bbc6e9602998a385c2ea13df56470fd"],["/img/glyphicons-halflings.png","74b801ed8644409a1d166bbf33ac3d95"],["/img/opensun-logo-clear.png","d8608b66b2ac0354973149a159157d49"],["/img/opensun-logo.png","b1f2199bfd36383ae5f964a2f52bb6c6"],["/img/place-menu.png","6b47c51758a8f4a3b66d1508f75db16f"],["/img/shotclock-logo-128.png","d7ff85adb85c13667beea21ae5b9ead7"],["/img/shotclock-logo-64.png","15a740c6594358b42b2d75f1a29486b3"],["/img/shotclock.png","f8d8ee7393949755b27c96dd0eb846bd"],["/img/small-progress.gif","30d8e72bfdae694b1938658e1b087df0"],["/img/splashscreen.png","17676ba2bb2c425cf1b018b0e8325742"],["/img/time-menu.png","9d9d5da99b367bb10138415cd5f1d7e6"],["/index.html","2d38f107dac9351afd9c73229fba5783"],["/js/app.js","6d4e4313689d71ba58b81b4ccf6d5766"],["/js/app2.js","639607f9e34dd52610ded5ea1c642782"],["/js/lib/bootstrap-datepicker.js","07a4d1f88e9f34025a0edb96772e1279"],["/js/lib/bootstrap.js","6bfd171748f088ad503cb07c080b1f33"],["/js/lib/bootstrap.min.js","046ba2b5f4cff7d2eaaa1af55caa9fd8"],["/js/lib/brick-1.0.1.js","0e4221d8d559277f886e3aa8980929e1"],["/js/lib/date.js","497166e7f447a56c7b279271c6c6e6c8"],["/js/lib/github.js","1de4e52f1ca4d11e8de1d0f6206c534d"],["/js/lib/jquery.js","e51be64870f23f7ba920206ed3efeab9"],["/js/lib/l10n.js","cab7dfe383d39b864cd3bc2c5db1830d"],["/js/lib/ol.js","336d8c482b703888c134a7c762201d0f"],["/js/lib/qunit.js","634210929ce5dba07d35a40101b78cef"],["/js/lib/sun-angle-utils.js","fe7a7fc482b25387918245eb9fb20dfb"],["/js/service-worker-registration.js","824607abf2503f7e8fea53521b9949e4"],["/js/shotclock-draw.js","6e6913a6aca74d296be57860eea33a25"],["/js/tests.js","ecde3eada6d98069bc4a073e055ed410"],["/l10n-data.ini","1015862374245880498dcafbaee13138"],["/w3c-manifest.json","95c2424fc002f5b5a0b911ba4a504619"]];
var CacheNamePrefix = 'sw-precache-v1--' + (self.registration ? self.registration.scope : '') + '-';


var IgnoreUrlParametersMatching = [/^utm_/];



var addDirectoryIndex = function (originalUrl, index) {
    var url = new URL(originalUrl);
    if (url.pathname.slice(-1) === '/') {
      url.pathname += index;
    }
    return url.toString();
  };

var populateCurrentCacheNames = function (precacheConfig, cacheNamePrefix, baseUrl) {
    var absoluteUrlToCacheName = {};
    var currentCacheNamesToAbsoluteUrl = {};

    precacheConfig.forEach(function(cacheOption) {
      var absoluteUrl = new URL('/opensun' + cacheOption[0], baseUrl).toString();
      var cacheName = cacheNamePrefix + absoluteUrl + '-' + cacheOption[1];
      currentCacheNamesToAbsoluteUrl[cacheName] = absoluteUrl;
      absoluteUrlToCacheName[absoluteUrl] = cacheName;
    });

    return {
      absoluteUrlToCacheName: absoluteUrlToCacheName,
      currentCacheNamesToAbsoluteUrl: currentCacheNamesToAbsoluteUrl
    };
  };

var stripIgnoredUrlParameters = function (originalUrl, ignoreUrlParametersMatching) {
    var url = new URL(originalUrl);

    url.search = url.search.slice(1) // Exclude initial '?'
      .split('&') // Split into an array of 'key=value' strings
      .map(function(kv) {
        return kv.split('='); // Split each 'key=value' string into a [key, value] array
      })
      .filter(function(kv) {
        return ignoreUrlParametersMatching.every(function(ignoredRegex) {
          return !ignoredRegex.test(kv[0]); // Return true iff the key doesn't match any of the regexes.
        });
      })
      .map(function(kv) {
        return kv.join('='); // Join each [key, value] array into a 'key=value' string
      })
      .join('&'); // Join the array of 'key=value' strings into a string with '&' in between each

    return url.toString();
  };


var mappings = populateCurrentCacheNames(PrecacheConfig, CacheNamePrefix, self.location);
var AbsoluteUrlToCacheName = mappings.absoluteUrlToCacheName;
var CurrentCacheNamesToAbsoluteUrl = mappings.currentCacheNamesToAbsoluteUrl;

function deleteAllCaches() {
  return caches.keys().then(function(cacheNames) {
    return Promise.all(
      cacheNames.map(function(cacheName) {
        return caches.delete(cacheName);
      })
    );
  });
}

self.addEventListener('install', function(event) {
  var now = Date.now();

  event.waitUntil(
    caches.keys().then(function(allCacheNames) {
      return Promise.all(
        Object.keys(CurrentCacheNamesToAbsoluteUrl).filter(function(cacheName) {
          return allCacheNames.indexOf(cacheName) == -1;
        }).map(function(cacheName) {
          var url = new URL(CurrentCacheNamesToAbsoluteUrl[cacheName]);
          // Put in a cache-busting parameter to ensure we're caching a fresh response.
          if (url.search) {
            url.search += '&';
          }
          url.search += 'sw-precache=' + now;
          var urlWithCacheBusting = url.toString();

          console.log('Adding URL "%s" to cache named "%s"', urlWithCacheBusting, cacheName);
          return caches.open(cacheName).then(function(cache) {
            var request = new Request(urlWithCacheBusting, {credentials: 'same-origin'});
            return fetch(request.clone()).then(function(response) {
              if (response.status == 200) {
                return cache.put(request, response);
              } else {
                console.error('Request for %s returned a response with status %d, so not attempting to cache it.',
                  urlWithCacheBusting, response.status);
                // Get rid of the empty cache if we can't add a successful response to it.
                return caches.delete(cacheName);
              }
            });
          });
        })
      ).then(function() {
        return Promise.all(
          allCacheNames.filter(function(cacheName) {
            return cacheName.indexOf(CacheNamePrefix) == 0 &&
                   !(cacheName in CurrentCacheNamesToAbsoluteUrl);
          }).map(function(cacheName) {
            console.log('Deleting out-of-date cache "%s"', cacheName);
            return caches.delete(cacheName);
          })
        )
      });
    }).then(function() {
      if (typeof self.skipWaiting == 'function') {
        // Force the SW to transition from installing -> active state
        self.skipWaiting();
      }
    })
  );
});

if (self.clients && (typeof self.clients.claim == 'function')) {
  self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
  });
}

self.addEventListener('message', function(event) {
  if (event.data.command == 'delete_all') {
    console.log('About to delete all caches...');
    deleteAllCaches().then(function() {
      console.log('Caches deleted.');
      event.ports[0].postMessage({
        error: null
      });
    }).catch(function(error) {
      console.log('Caches not deleted:', error);
      event.ports[0].postMessage({
        error: error
      });
    });
  }
});


self.addEventListener('fetch', function(event) {
  if (event.request.method == 'GET') {
    var urlWithoutIgnoredParameters = stripIgnoredUrlParameters(event.request.url,
      IgnoreUrlParametersMatching);

    var cacheName = AbsoluteUrlToCacheName[urlWithoutIgnoredParameters];
    var directoryIndex = 'index.html';
    if (!cacheName && directoryIndex) {
      urlWithoutIgnoredParameters = addDirectoryIndex(urlWithoutIgnoredParameters, directoryIndex);
      cacheName = AbsoluteUrlToCacheName[urlWithoutIgnoredParameters];
    }

    if (cacheName) {
      event.respondWith(
        // We can't call cache.match(event.request) since the entry in the cache will contain the
        // cache-busting parameter. Instead, rely on the fact that each cache should only have one
        // entry, and return that.
        caches.open(cacheName).then(function(cache) {
          return cache.keys().then(function(keys) {
            return cache.match(keys[0]).then(function(response) {
              return response || fetch(event.request).catch(function(e) {
                console.error('Fetch for "%s" failed: %O', urlWithoutIgnoredParameters, e);
              });
            });
          });
        }).catch(function(e) {
          console.error('Couldn\'t serve response for "%s" from cache: %O', urlWithoutIgnoredParameters, e);
          return fetch(event.request);
        })
      );
    }
  }
});

