import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function offlineServiceWorker() {
  return {
    name: "offline-service-worker",
    generateBundle(_, bundle) {
      const assets = Object.keys(bundle).filter((file) => (
        file !== "sw.js"
        && !file.endsWith(".map")
        && !/pdf(?:Parser|\.worker)/i.test(file)
      ));
      const precache = ["/", "/manifest.webmanifest", "/icon.svg", ...assets.map((file) => `/${file}`)];
      const source = `
const CACHE_NAME = "cap-pilote-${Date.now()}";
const APP_SHELL = ${JSON.stringify(precache)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith("cap-pilote-") && key !== CACHE_NAME).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("/", copy));
      }
      return response;
    }).catch(() => caches.match("/")));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => {
    if (cached) return cached;
    return fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    });
  }));
});
`;
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineServiceWorker()],
});
