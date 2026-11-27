/* Tinoclean Laundry Service Worker — PWA, Web Push & App Badging */
const CACHE_NAME = "tinoclean-v2";
const OFFLINE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/sounds/tinoclean-tone.wav",
];

let lastBadgeClearAt = 0;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});

async function applySwBadge(count, closeTag) {
  const safeCount = Math.max(0, Math.floor(Number(count || 0)));
  if ("setAppBadge" in self.navigator) {
    try {
      if (safeCount > 0) {
        await self.navigator.setAppBadge(safeCount);
      } else {
        await self.navigator.clearAppBadge();
      }
    } catch {
      // Platform does not allow badging in this context
    }
  }

  if (safeCount === 0 || closeTag) {
    try {
      const shown = await self.registration.getNotifications(
        closeTag ? { tag: closeTag } : undefined
      );
      shown.forEach((n) => n.close());
      console.log("[Tinoclean SW] Badge synced:", safeCount, "Closed notifications:", shown.length);
    } catch {
      // Ignore
    }
  } else {
    console.log("[Tinoclean SW] Badge synced:", safeCount);
  }
}

self.addEventListener("push", (event) => {
  let payload = {
    title: "Tinoclean Laundry",
    body: "You have a new laundry update.",
    url: "/notifications",
    tag: "tinoclean-update",
    unreadCount: 1,
    sentAt: Date.now(),
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  // Prevent an older delayed push from restoring a stale non-zero badge after user cleared it
  const isStaleAfterClear =
    typeof payload.sentAt === "number" && payload.sentAt < lastBadgeClearAt;
  const badgeCount = isStaleAfterClear
    ? 0
    : typeof payload.unreadCount === "number"
    ? payload.unreadCount
    : 1;

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: payload.tag || "tinoclean-update",
        data: { url: payload.url || "/notifications", unreadCount: badgeCount },
        vibrate: [120, 60, 120],
        silent: false,
        renotify: true,
      }),
      applySwBadge(badgeCount),
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "TINOCLEAN_PUSH_RECEIVED",
            payload,
          });
        });
      }),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/orders";

  event.waitUntil(
    (async () => {
      if (targetUrl.includes("/notifications")) {
        const shown = await self.registration.getNotifications();
        shown.forEach((n) => n.close());
      }
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SET_BADGE") {
    const count = Number(event.data.count || 0);
    if (count === 0) {
      lastBadgeClearAt = Date.now();
    }
    event.waitUntil(applySwBadge(count, event.data.closeTag));
  }
});
