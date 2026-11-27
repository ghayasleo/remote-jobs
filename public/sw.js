/* Remote Jobs service worker: lets the installed app open pages you've
   already visited, and shows /offline for the rest, when there's no network. */

const VERSION = "v2";
const PAGES = `pages-${VERSION}`;
const STATIC = `static-${VERSION}`;
const LOGOS = `logos-${VERSION}`;
const DATA = `data-${VERSION}`;
const OFFLINE_URL = "/offline";
const LIMITS = { [PAGES]: 60, [STATIC]: 250, [LOGOS]: 400, [DATA]: 4 };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  const current = new Set(Object.keys(LIMITS));
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !current.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith("/logo/")) {
    event.respondWith(staleWhileRevalidate(event, request, LOGOS));
  } else if (url.pathname === "/data/explore.json" || url.pathname === "/data/jobs.json") {
    // The company list: instant from cache (and offline), refreshed in the background.
    event.respondWith(staleWhileRevalidate(event, request, DATA));
  }
  // Everything else (RSC payloads, APIs) goes straight to the network; Next.js
  // retries client navigations itself once the connection is back.
});

async function remember(cacheName, request, response) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  const keys = await cache.keys();
  const excess = keys.length - LIMITS[cacheName];
  for (const key of keys.slice(0, Math.max(0, excess))) await cache.delete(key);
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") remember(PAGES, request, response.clone());
    return response;
  } catch {
    const cache = await caches.open(PAGES);
    // Filters live in the query string and are applied in the browser, so any
    // cached copy of the same page is a good fallback.
    return (
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match(OFFLINE_URL)) ||
      Response.error()
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) remember(STATIC, request, response.clone());
  return response;
}

async function staleWhileRevalidate(event, request, cacheName) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) remember(cacheName, request, response.clone());
      return response;
    })
    .catch(() => cached || Response.error());
  if (!cached) return network;
  event.waitUntil(network);
  return cached;
}

/* Job alerts: show the notification the server sent, and open its page on tap. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "New remote roles", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "New remote roles", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/jobs" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/jobs", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url === url);
      return open ? open.focus() : self.clients.openWindow(url);
    }),
  );
});
