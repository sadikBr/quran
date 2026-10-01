import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function setup({
    missingAsset = null,
    owner = { enabled: true, sessionId: "session-a" },
} = {}) {
    const origin = "https://app.example";
    const buckets = new Map();
    const listeners = new Map();
    const statuses = [];
    const notifications = [];
    const requests = [];
    let online = true;
    const key = (value) =>
        new URL(typeof value === "string" ? value : value.url, origin).href;
    const caches = {
        async open(name) {
            if (!buckets.has(name)) buckets.set(name, new Map());
            const entries = buckets.get(name);
            return {
                async put(url, response) {
                    entries.set(key(url), response.clone());
                },
                async match(url) {
                    return entries.get(key(url))?.clone();
                },
            };
        },
        async keys() {
            return [...buckets.keys()];
        },
        async delete(name) {
            return buckets.delete(name);
        },
    };
    async function fetchMock(input) {
        const url = new URL(key(input));
        requests.push(url.pathname);
        if (!online) throw new Error("offline");
        if (url.pathname === missingAsset)
            return new Response("Missing", { status: 404 });
        if (url.pathname === "/api/notifications/subscription")
            return Response.json(owner);
        if (url.pathname === "/offline")
            return new Response(
                '<html><script src="/_next/static/offline.js?dpl=test"></script><link href="/_next/static/offline.css" rel="stylesheet"><a href="/profile">Profile</a></html>',
            );
        if (url.pathname.endsWith(".css"))
            return new Response(
                '@font-face{src:url("/api/quran/hafs-font")} .reader{font:url("./reader.woff2")}',
            );
        return new Response(`cached:${url.pathname}`);
    }
    vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
        caches,
        fetch: fetchMock,
        URL,
        URLSearchParams,
        Response,
        AbortSignal,
        self: {
            location: { origin },
            skipWaiting: async () => {},
            clients: {
                matchAll: async () => [
                    { postMessage: (value) => statuses.push(value.status) },
                ],
                claim: async () => {},
            },
            registration: {
                pushManager: {
                    getSubscription: async () => ({
                        endpoint: "https://fcm.googleapis.com/test",
                    }),
                },
                showNotification: async (...args) => notifications.push(args),
            },
            addEventListener: (name, callback) => listeners.set(name, callback),
        },
    });
    function dispatch(type, extra = {}) {
        let pending;
        listeners.get(type)({
            ...extra,
            waitUntil: (promise) => {
                pending = promise;
            },
            respondWith: (promise) => {
                pending = promise;
            },
        });
        return pending;
    }
    return {
        buckets,
        statuses,
        requests,
        notifications,
        caches,
        offline: () => {
            online = false;
        },
        download: () =>
            dispatch("message", { data: { type: "DOWNLOAD_QURAN_LIBRARY" } }),
        status: () =>
            dispatch("message", { data: { type: "GET_QURAN_LIBRARY_STATUS" } }),
        asset: (path) =>
            dispatch("fetch", { request: new Request(origin + path) }),
        navigate: () =>
            dispatch("fetch", {
                request: {
                    url: `${origin}/offline`,
                    method: "GET",
                    mode: "navigate",
                },
            }),
        push: (sessionId) =>
            dispatch("push", {
                data: {
                    json: () => ({
                        recipientSessionId: sessionId,
                        title: "Private",
                        body: "Feedback",
                    }),
                },
            }),
    };
}

test("a fresh download boots offline without ever visiting the reader online", async () => {
    const app = setup();
    await app.download();
    expect(app.statuses.at(-1).state).toBe("ready");
    expect(app.requests).not.toContain("/profile");
    app.offline();
    expect((await app.navigate()).status).toBe(200);
    for (const path of [
        "/_next/static/offline.js?dpl=test",
        "/_next/static/offline.css",
        "/_next/static/reader.woff2",
        "/api/quran/hafs-font",
        "/amiri.ttf",
    ]) {
        expect((await app.asset(path)).status).toBe(200);
    }
    await app.status();
    expect(app.statuses.at(-1).state).toBe("ready");
    await app.download();
    expect(app.statuses.at(-1).state).toBe("ready");
});

test("missing essential scripts or fonts never report offline readiness", async () => {
    for (const missingAsset of [
        "/_next/static/offline.js",
        "/api/quran/hafs-font",
    ]) {
        const app = setup({ missingAsset });
        await app.download();
        expect(app.statuses.at(-1).state).toBe("error");
        await app.status();
        expect(app.statuses.at(-1).state).toBe("idle");
    }
});

test("a failed upgrade preserves the previous cached reader and runtime assets", async () => {
    const app = setup({ missingAsset: "/_next/static/offline.js" });
    const shell = await app.caches.open("quran-shell-old");
    await shell.put("/offline", new Response("old reader"));
    const runtime = await app.caches.open("quran-runtime-old");
    await runtime.put("/_next/static/old.js", new Response("old script"));
    await app.download();
    app.offline();
    expect(await (await app.navigate()).text()).toBe("old reader");
    expect(await (await app.asset("/_next/static/old.js")).text()).toBe(
        "old script",
    );
});

test("queued private pushes are shown only to the originating live session", async () => {
    const current = setup();
    await current.push("session-a");
    expect(current.notifications).toHaveLength(1);
    for (const owner of [
        { enabled: false, sessionId: null },
        { enabled: true, sessionId: "session-b" },
    ]) {
        const app = setup({ owner });
        await app.push("session-a");
        expect(app.notifications).toHaveLength(0);
    }
    const offline = setup();
    offline.offline();
    await offline.push("session-a");
    expect(offline.notifications).toHaveLength(0);
    const legacy = setup();
    await legacy.push(undefined);
    expect(legacy.notifications).toHaveLength(0);
});
