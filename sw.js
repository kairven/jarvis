/* J.A.R.V.I.S. MK-II — service worker
   Strategy: NETWORK-FIRST for the app shell (so a fix or update lands on the very
   next load), CACHE-FIRST for static assets (icons, manifest) for instant paint.
   AI API calls are never touched — they always go straight to the network. */
var CACHE = "jarvis-mk2-v13";
var SHELL = ["./", "./index.html"];
var ASSETS = ["./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-180.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL.concat(ASSETS)); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;              /* AI APIs & CDNs: untouched */

  var isShell = req.mode === "navigate" || /\/$|\/index\.html$/.test(url.pathname);

  if (isShell) {
    /* network-first: never let a stale/broken build stick to the user */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match("./index.html"); });
      })
    );
    return;
  }

  /* static assets: cache-first */
  e.respondWith(
    caches.match(req).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match("./index.html"); });
    })
  );
});
