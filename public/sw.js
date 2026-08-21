/**
 * Service worker for the app shell.
 *
 * Firestore's own IndexedDB cache already handles the *data* — cards, review
 * logs, queued ratings. What it cannot do is serve the HTML and JavaScript
 * needed to render any of it, so without this a student with no signal gets
 * the browser's dinosaur instead of their due cards.
 *
 * Deliberately conservative:
 *
 *  - Never cache anything under /api. Those are authenticated, per-user, and
 *    sometimes cost money; a stale generation response would be worse than an
 *    honest failure.
 *  - Network-first for navigations, so a student online always gets the
 *    current build and we never pin them to a stale shell after a deploy.
 *  - Cache-first for immutable build assets, which is what makes an offline
 *    launch fast rather than merely possible.
 *  - One cache version per release; everything else is dropped on activate,
 *    so an old bundle cannot outlive its deploy.
 */

const VERSION = "tuon-v1";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;

/** Shown when a navigation fails and nothing is cached. */
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([OFFLINE_URL]))
      // A failed precache must not block activation; the fetch handler copes.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin only. Firestore, Google auth and fonts manage themselves, and
  // caching a token endpoint would be a genuine security problem.
  if (url.origin !== self.location.origin) return;

  // Authenticated, per-user, occasionally expensive. Always live.
  if (url.pathname.startsWith("/api/")) return;

  // Immutable build output — safe to serve from cache forever, since a new
  // build produces new filenames.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations: network first, fall back to the last good copy, then to the
  // offline page. Being one deploy behind is worse than being briefly slow.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(SHELL).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match(OFFLINE_URL))
            .then(
              (hit) =>
                hit ||
                new Response("Offline", {
                  status: 503,
                  headers: { "content-type": "text/plain" },
                }),
            ),
        ),
    );
  }
});
