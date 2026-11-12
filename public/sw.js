const CACHE_PREFIX = "javier-prado-oeste-2168-";
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_REVISION__`;

async function matchOwnCache(request) {
  // Precache requests can omit the Origin header sent by module and stylesheet loads.
  // Files in this same-origin Pages build are static and do not vary by request headers.
  return (await caches.open(CACHE_NAME)).match(request, { ignoreVary: true });
}
const APP_SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg", "offline-cache-manifest.json"];
const scopeUrl = (path) => new URL(path, self.registration.scope);
const requestFresh = (path) => new Request(scopeUrl(path), { cache: "reload" });
let warmingCache;

async function offlineFiles() {
  const response = await fetch(scopeUrl("offline-cache-manifest.json"), { cache: "no-store" });
  if (!response.ok) throw new Error("Release manifest unavailable");
  const manifest = await response.json();
  if (`${CACHE_PREFIX}${manifest.buildRevision}` !== CACHE_NAME) throw new Error("Release manifest does not match worker");
  return [...new Set([...APP_SHELL, ...manifest.files])];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const files = await offlineFiles();
      const shell = files.filter(file => APP_SHELL.includes(file) ||
        (file.startsWith("assets/") && /\.(js|css)$/.test(file)));
      await cache.addAll(shell.map(requestFresh));
      await self.skipWaiting();
    })
  );

});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function warmOfflineCache() {
  const cache = await caches.open(CACHE_NAME);
  const ready = scopeUrl(".offline-ready");
  if (await cache.match(ready)) return;
  const files = await offlineFiles();
  for (const file of files) {
    const request = requestFresh(file);
    if (!await cache.match(request, { ignoreVary: true })) await cache.add(request);
  }
  await cache.put(ready, new Response("ready"));
  const keys = await caches.keys();
  const previous = keys.slice(0, keys.indexOf(CACHE_NAME)).filter(key => key.startsWith(CACHE_PREFIX));
  await Promise.all(previous.map(key => caches.delete(key)));
}

self.addEventListener("message", (event) => {
  if (event.data !== "prepare-offline") return;
  warmingCache ??= warmOfflineCache().finally(() => { warmingCache = undefined; });
  event.waitUntil(warmingCache.catch(() => undefined));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (url.searchParams.has("sync") &&
      (url.pathname.endsWith("/offline-cache-manifest.json") || url.pathname.endsWith("/content/project.json"))) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      matchOwnCache(new URL("index.html", self.registration.scope))
        .then(cached => cached ?? fetch(event.request, { cache: "no-store" }))
    );
    return;
  }

  event.respondWith(
    matchOwnCache(event.request).then(async (cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          const keys = await caches.keys();
          for (const key of keys.reverse()) {
            if (key === CACHE_NAME || !key.startsWith(CACHE_PREFIX)) continue;
            const response = await (await caches.open(key)).match(event.request, { ignoreVary: true });
            if (response) return response;
          }
          return Response.error();
        });
    })
  );
});
