const CACHE_PREFIX = "javier-prado-oeste-2168-";
const CACHE_NAME = `${CACHE_PREFIX}__BUILD_REVISION__`;

async function matchOwnCache(request) {
  // Precache requests can omit the Origin header sent by module and stylesheet loads.
  // Files in this same-origin Pages build are static and do not vary by request headers.
  return (await caches.open(CACHE_NAME)).match(request, { ignoreVary: true });
}
const APP_SHELL = ["./", "index.html", "manifest.webmanifest", "icon.svg", "offline-cache-manifest.json"];

async function offlineFiles() {
  const response = await fetch(new URL("offline-cache-manifest.json", self.registration.scope), { cache: "no-store" });
  if (!response.ok) throw new Error("Release manifest unavailable");
  const manifest = await response.json();
  if (`${CACHE_PREFIX}${manifest.buildRevision}` !== CACHE_NAME) throw new Error("Release manifest does not match worker");
  return [...new Set([...APP_SHELL, ...manifest.files])];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const files = await offlineFiles();
      await cache.addAll(files.map((file) => new Request(new URL(file, self.registration.scope), { cache: "reload" })));
      await self.skipWaiting();
    })
  );

});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );

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
        .catch(() => Response.error());
    })
  );
});
