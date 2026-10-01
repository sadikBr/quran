import { expect, test } from "bun:test";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import * as subscriptionRules from "../src/features/notifications/push-subscription";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

function subscription(endpoint = "https://fcm.googleapis.com/fcm/send/test") {
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    return {
        userId: "alice",
        endpoint,
        keys: {
            p256dh: ecdh.getPublicKey().toString("base64url"),
            auth: randomBytes(16).toString("base64url"),
        },
    };
}

test("push endpoints allow browser services and reject internal, disguised, and arbitrary URLs", () => {
    for (const endpoint of [
        "https://fcm.googleapis.com/fcm/send/token",
        "https://updates.push.services.mozilla.com/wpush/v2/token",
        "https://updates-autopush.push.services.mozilla.com/wpush/v2/token",
        "https://web.push.apple.com/token",
        "https://wns2.notify.windows.com/token",
    ])
        expect(
            subscriptionRules.pushSubscriptionSchema.safeParse(
                subscription(endpoint),
            ).success,
        ).toBe(true);
    for (const endpoint of [
        "http://fcm.googleapis.com/token",
        "https://127.0.0.1/token",
        "https://[::1]/token",
        "https://169.254.169.254/token",
        "https://10.0.0.1/token",
        "https://attacker.example/token",
        "https://fcm.googleapis.com.attacker.example/token",
        "https://fcm.googleapis.com@attacker.example/token",
        "https://user:secret@fcm.googleapis.com/token",
        "https://fcm.googleapis.com:8443/token",
        "https://fcm.googleapis.com/token#fragment",
    ])
        expect(
            subscriptionRules.pushSubscriptionSchema.safeParse(
                subscription(endpoint),
            ).success,
        ).toBe(false);
});

const columns = new Proxy({}, { get: (_, name) => String(name) });
const predicates = {
    and: (...conditions) => conditions,
    eq: (column, value) => ({ column, value }),
    gt: (column, value) => ({ column, after: value }),
};

function sender(owner = { userId: "alice", sessionId: "session-a" }) {
    const messages = [];
    let conditions;
    let reads = 0;
    const db = {
        select: () => {
            reads++;
            return {
                from: () => ({
                    innerJoin: () => ({
                        where: (value) => {
                            conditions = value;
                            return {
                                limit: async () => (owner ? [owner] : []),
                            };
                        },
                    }),
                }),
            };
        },
    };
    const module = loadTypeScript(
        "src/features/notifications/server/web-push.ts",
        {
            "server-only": {},
            "drizzle-orm": predicates,
            "web-push": {
                sendNotification: async (...args) => messages.push(args),
            },
            "@/data/env/server": { env: {} },
            "@/drizzle/db": db,
            "@/drizzle/schema": { pushSubscription: columns, session: columns },
            "../push-subscription": subscriptionRules,
        },
    );
    return {
        ...module,
        messages,
        conditions: () => conditions,
        reads: () => reads,
    };
}

test("delivery revalidates stored endpoints before any database or network work", async () => {
    const service = sender();
    const error = await service
        .sendPushNotification(subscription("https://localhost/push"), "{}")
        .catch((e) => e);
    expect(service.isExpiredPushSubscription(error)).toBe(true);
    expect(service.reads()).toBe(0);
    expect(service.messages).toHaveLength(0);
});

test("delivery rejects inactive ownership without deleting a reassigned device", async () => {
    const service = sender(null);
    const error = await service
        .sendPushNotification(subscription(), "{}")
        .catch((e) => e);
    expect(service.isExpiredPushSubscription(error)).toBe(false);
    expect(service.messages).toHaveLength(0);
    expect(
        service
            .conditions()
            .some(
                (condition) =>
                    condition.column === "expiresAt" &&
                    condition.after instanceof Date,
            ),
    ).toBe(true);
});

test("delivery binds the original recipient and sets a timeout and session marker", async () => {
    const service = sender();
    await service.sendPushNotification(
        subscription(),
        '{"title":"Private","recipientSessionId":"forged"}',
        { TTL: 60, timeout: 0 },
    );
    expect(service.conditions()).toContainEqual({
        column: "userId",
        value: "alice",
    });
    const [, payload, options] = service.messages[0];
    expect(JSON.parse(payload).recipientSessionId).toBe("session-a");
    expect(options).toMatchObject({ TTL: 60, timeout: 10000 });
});

function routeHarness() {
    let current = { user: { id: "alice" }, session: { id: "session-a" } };
    let stored;
    const db = {
        insert: () => ({
            values: (value) => ({
                onConflictDoUpdate: async () => {
                    stored = value;
                },
            }),
        }),
        select: () => ({
            from: () => ({
                where: (conditions) => ({
                    limit: async () =>
                        stored &&
                        conditions.every(
                            ({ column, value }) => stored[column] === value,
                        )
                            ? [{ id: "push" }]
                            : [],
                }),
            }),
        }),
    };
    const route = loadTypeScript(
        "src/app/api/notifications/subscription/route.ts",
        {
            "node:crypto": { randomUUID },
            "drizzle-orm": predicates,
            "next/headers": { headers: async () => new Headers() },
            "next/server": {
                NextResponse: {
                    json: (value, init) => Response.json(value, init),
                },
            },
            zod: { z },
            "@/drizzle/db": db,
            "@/drizzle/schema": { pushSubscription: columns },
            "@/features/auth/auth": {
                auth: { api: { getSession: async () => current } },
            },
            "@/features/notifications/push-subscription": subscriptionRules,
        },
    );
    return {
        route,
        setSession: (value) => {
            current = value;
        },
        stored: () => stored,
    };
}

test("registration requires authentication, valid JSON and an allowed push service", async () => {
    const { route, setSession, stored } = routeHarness();
    const post = (body) =>
        route.POST(
            new Request("https://app.example/api/notifications/subscription", {
                method: "POST",
                body,
            }),
        );
    expect((await post("{")).status).toBe(400);
    expect(
        (await post(JSON.stringify(subscription("https://127.0.0.1/")))).status,
    ).toBe(400);
    expect(stored()).toBeUndefined();
    setSession(null);
    expect((await post(JSON.stringify(subscription()))).status).toBe(401);
});

test("a device subscription is enabled only for the account AND session that registered it", async () => {
    const { route, setSession, stored } = routeHarness();
    const data = subscription();
    await route.POST(
        new Request("https://app.example/api/notifications/subscription", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    );
    expect(stored().sessionId).toBe("session-a");
    const get = () =>
        route.GET(
            new Request(
                `https://app.example/api/notifications/subscription?${new URLSearchParams({ endpoint: data.endpoint })}`,
            ),
        );
    expect(await (await get()).json()).toEqual({
        enabled: true,
        sessionId: "session-a",
    });
    for (const session of [
        null,
        { user: { id: "bob" }, session: { id: "session-b" } },
        { user: { id: "alice" }, session: { id: "new-session" } },
    ]) {
        setSession(session);
        const response = await get();
        expect(await response.json()).toEqual({
            enabled: false,
            sessionId: null,
        });
        expect(response.headers.get("cache-control")).toContain("no-store");
    }
});

test("signout clears the browser subscription and already displayed notifications", async () => {
    let unsubscribed = false;
    let closed = false;
    const helper = loadTypeScript(
        "src/features/notifications/device-subscription.ts",
        {},
        {
            navigator: {
                serviceWorker: {
                    getRegistration: async () => ({
                        pushManager: {
                            getSubscription: async () => ({
                                unsubscribe: async () => {
                                    unsubscribed = true;
                                },
                            }),
                        },
                        getNotifications: async () => [
                            {
                                close: () => {
                                    closed = true;
                                },
                            },
                        ],
                    }),
                },
            },
        },
    );
    await helper.clearDevicePushSubscription();
    expect(unsubscribed && closed).toBe(true);
});

test("account switching removes an unowned subscription; an offline check preserves it", async () => {
    for (const offline of [false, true]) {
        let removed = false;
        const helper = loadTypeScript(
            "src/features/notifications/device-subscription.ts",
            {},
            {
                navigator: {
                    serviceWorker: {
                        getRegistration: async () => ({
                            pushManager: {
                                getSubscription: async () => ({
                                    endpoint: "https://fcm.googleapis.com/test",
                                    unsubscribe: async () => {
                                        removed = true;
                                    },
                                }),
                            },
                            getNotifications: async () => [],
                        }),
                    },
                },
                fetch: async () => {
                    if (offline) throw new Error("offline");
                    return Response.json({ enabled: false });
                },
            },
        );
        await helper.getOwnedPushSubscription().catch(() => {});
        expect(removed).toBe(!offline);
    }
});
