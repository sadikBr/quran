import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import { pushSubscription } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";
import {
    pushEndpointSchema,
    pushSubscriptionSchema,
} from "@/features/notifications/push-subscription";

async function getUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.id ?? null;
}

export async function POST(request: Request) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const result = pushSubscriptionSchema.safeParse(
        await request.json().catch(() => null),
    );
    if (!result.success) {
        return NextResponse.json({ success: false }, { status: 400 });
    }

    await db
        .insert(pushSubscription)
        .values({
            id: randomUUID(),
            userId: session.user.id,
            sessionId: session.session.id,
            endpoint: result.data.endpoint,
            p256dh: result.data.keys.p256dh,
            auth: result.data.keys.auth,
            userAgent: request.headers.get("user-agent"),
        })
        .onConflictDoUpdate({
            target: pushSubscription.endpoint,
            set: {
                userId: session.user.id,
                sessionId: session.session.id,
                p256dh: result.data.keys.p256dh,
                auth: result.data.keys.auth,
                userAgent: request.headers.get("user-agent"),
                lastWirdReminderDate: null,
                updatedAt: new Date(),
            },
        });

    return NextResponse.json({ success: true });
}

// Used by settings and the service worker. Never expose another account's owner.
export async function GET(request: Request) {
    const current = await auth.api.getSession({ headers: await headers() });
    const endpoint = pushEndpointSchema.safeParse(
        new URL(request.url).searchParams.get("endpoint"),
    );
    let enabled = false;
    if (current && endpoint.success) {
        const [owned] = await db
            .select({ id: pushSubscription.id })
            .from(pushSubscription)
            .where(
                and(
                    eq(pushSubscription.endpoint, endpoint.data),
                    eq(pushSubscription.userId, current.user.id),
                    eq(pushSubscription.sessionId, current.session.id),
                ),
            )
            .limit(1);
        enabled = Boolean(owned);
    }
    return NextResponse.json(
        { enabled, sessionId: enabled ? current?.session.id : null },
        {
            headers: { "Cache-Control": "private, no-store" },
        },
    );
}

export async function DELETE(request: Request) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const result = z
        .object({ endpoint: z.string().max(2048).url() })
        .safeParse(await request.json().catch(() => null));
    if (!result.success) {
        return NextResponse.json({ success: false }, { status: 400 });
    }

    await db
        .delete(pushSubscription)
        .where(
            and(
                eq(pushSubscription.userId, userId),
                eq(pushSubscription.endpoint, result.data.endpoint),
            ),
        );

    return NextResponse.json({ success: true });
}
