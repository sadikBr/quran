/* global self, caches */

const OFFLINE_VERSION = "2026.10.01.2";
const SHELL_CACHE = `quran-shell-${OFFLINE_VERSION}`;
const LIBRARY_CACHE = `quran-library-${OFFLINE_VERSION}`;
const RUNTIME_CACHE = `quran-runtime-${OFFLINE_VERSION}`;
const OFFLINE_PAGE = "/offline";
const LIBRARY_URLS = [
    "/api/offline/quran/hafs",
    "/api/offline/quran/warsh",
    "/api/offline/quran/translation",
];
const CORE_ASSETS = [
    OFFLINE_PAGE,
    "/amiri.ttf",
    "/surah_name.ttf",
    "/ayah_number_frame.ttf",
    "/icon-192.png",
    "/icon-512.png",
];

async function notifyClients(status) {
    const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
    });
    for (const client of clients) {
        client.postMessage({ type: "QURAN_OFFLINE_STATUS", status });
    }
}

async function cacheOfflineShell() {
    const cache = await caches.open(SHELL_CACHE);
    const page = await fetch(OFFLINE_PAGE, { cache: "no-store" });
    if (!page.ok) throw new Error("Unable to prepare the offline reader.");

    await cache.put(OFFLINE_PAGE, page.clone());
    const html = await page.text();
    const assetUrls = new Set(CORE_ASSETS.slice(1));
    const sourcePattern = /(?:src|href)=["']([^"']+)["']/g;
    let match = sourcePattern.exec(html);
    while (match) {
        const url = new URL(match[1], self.location.origin);
        if (url.origin === self.location.origin) assetUrls.add(url.pathname);
        match = sourcePattern.exec(html);
    }

    await Promise.allSettled(
        [...assetUrls].map(async (url) => {
            const response = await fetch(url);
            if (response.ok) await cache.put(url, response);
        }),
    );
}

async function hasCompleteLibrary() {
    const cache = await caches.open(LIBRARY_CACHE);
    const entries = await Promise.all(
        LIBRARY_URLS.map((url) => cache.match(url)),
    );
    return entries.every(Boolean);
}

async function matchVersionedCache(prefix, request, preferredCache) {
    const preferred = await caches.open(preferredCache);
    const current = await preferred.match(request);
    if (current) return current;

    const keys = await caches.keys();
    for (const key of keys
        .filter((item) => item.startsWith(prefix))
        .reverse()) {
        if (key === preferredCache) continue;
        const cached = await (await caches.open(key)).match(request);
        if (cached) return cached;
    }
}

async function removeSupersededOfflineCaches() {
    const keys = await caches.keys();
    await Promise.all(
        keys
            .filter(
                (key) =>
                    (key.startsWith("quran-shell-") && key !== SHELL_CACHE) ||
                    (key.startsWith("quran-library-") && key !== LIBRARY_CACHE),
            )
            .map((key) => caches.delete(key)),
    );
}

let downloadPromise;
async function downloadQuranLibrary({ force = false } = {}) {
    if (downloadPromise) return downloadPromise;

    downloadPromise = (async () => {
        if (!force && (await hasCompleteLibrary())) {
            await cacheOfflineShell();
            await notifyClients({
                state: "ready",
                current: LIBRARY_URLS.length,
                total: LIBRARY_URLS.length,
                version: OFFLINE_VERSION,
            });
            return;
        }

        await notifyClients({
            state: "downloading",
            current: 0,
            total: LIBRARY_URLS.length,
            version: OFFLINE_VERSION,
        });

        const cache = await caches.open(LIBRARY_CACHE);
        let current = 0;
        for (const url of LIBRARY_URLS) {
            const response = await fetch(url, { cache: "no-store" });
            if (!response.ok) {
                throw new Error(`Unable to download ${url}.`);
            }
            await cache.put(url, response);
            current += 1;
            await notifyClients({
                state: "downloading",
                current,
                total: LIBRARY_URLS.length,
                version: OFFLINE_VERSION,
            });
        }

        await cacheOfflineShell();
        await removeSupersededOfflineCaches();
        await notifyClients({
            state: "ready",
            current: LIBRARY_URLS.length,
            total: LIBRARY_URLS.length,
            version: OFFLINE_VERSION,
            updatedAt: new Date().toISOString(),
        });
    })()
        .catch(async () => {
            await notifyClients({
                state: "error",
                version: OFFLINE_VERSION,
            });
        })
        .finally(() => {
            downloadPromise = undefined;
        });

    return downloadPromise;
}

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.addAll(CORE_ASSETS))
            .then(() => self.skipWaiting()),
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        Promise.all([
            caches
                .keys()
                .then((keys) =>
                    Promise.all(
                        keys
                            .filter(
                                (key) =>
                                    key.startsWith("quran-runtime-") &&
                                    key !== RUNTIME_CACHE,
                            )
                            .map((key) => caches.delete(key)),
                    ),
                ),
            self.clients.claim(),
        ]),
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "DOWNLOAD_QURAN_LIBRARY") {
        event.waitUntil(downloadQuranLibrary());
    }
    if (event.data?.type === "REFRESH_QURAN_LIBRARY") {
        event.waitUntil(downloadQuranLibrary({ force: true }));
    }
    if (event.data?.type === "GET_QURAN_LIBRARY_STATUS") {
        event.waitUntil(
            hasCompleteLibrary().then((ready) =>
                notifyClients({
                    state: ready ? "ready" : "idle",
                    current: ready ? LIBRARY_URLS.length : 0,
                    total: LIBRARY_URLS.length,
                    version: OFFLINE_VERSION,
                }),
            ),
        );
    }
});

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (LIBRARY_URLS.includes(url.pathname)) {
        event.respondWith(
            matchVersionedCache("quran-library-", request, LIBRARY_CACHE).then(
                (cached) => cached ?? fetch(request),
            ),
        );
        return;
    }

    if (
        url.pathname.startsWith("/_next/static/") ||
        url.pathname.endsWith(".ttf") ||
        url.pathname.endsWith(".woff2") ||
        url.pathname.endsWith(".png") ||
        url.pathname.endsWith(".webp")
    ) {
        event.respondWith(
            caches.open(RUNTIME_CACHE).then(async (cache) => {
                try {
                    const response = await fetch(request);
                    if (response.ok) await cache.put(request, response.clone());
                    return response;
                } catch {
                    const cached = await cache.match(request);
                    if (cached) return cached;
                    throw new Error("This offline asset is not available.");
                }
            }),
        );
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(async () => {
                return (
                    (await matchVersionedCache(
                        "quran-shell-",
                        OFFLINE_PAGE,
                        SHELL_CACHE,
                    )) ??
                    new Response("Offline", {
                        status: 503,
                        headers: { "Content-Type": "text/plain" },
                    })
                );
            }),
        );
    }
});

self.addEventListener("push", (event) => {
    if (!event.data) return;

    let message;
    try {
        message = event.data.json();
    } catch {
        return;
    }

    event.waitUntil(
        self.registration.showNotification(message.title, {
            body: message.body,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            tag: message.tag ?? "quran-reminder",
            renotify: true,
            data: {
                url: message.url ?? "/",
            },
        }),
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const destination = new URL(
        event.notification.data?.url ?? "/",
        self.location.origin,
    ).href;

    event.waitUntil(
        self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then((clients) => {
                for (const client of clients) {
                    if (client.url.startsWith(self.location.origin)) {
                        client.navigate(destination);
                        return client.focus();
                    }
                }
                return self.clients.openWindow(destination);
            }),
    );
});
