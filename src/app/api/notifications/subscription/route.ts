import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/drizzle/db";
import { pushSubscription } from "@/drizzle/schema";
import { auth } from "@/features/auth/auth";

const subscriptionSchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
        p256dh: z.string().min(1),
        auth: z.string().min(1),
    }),
});

async function getUserId() {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user.id ?? null;
}

export async function POST(request: Request) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const result = subscriptionSchema.safeParse(await request.json());
    if (!result.success) {
        return NextResponse.json({ success: false }, { status: 400 });
    }

    await db
        .insert(pushSubscription)
        .values({
            id: randomUUID(),
            userId,
            endpoint: result.data.endpoint,
            p256dh: result.data.keys.p256dh,
            auth: result.data.keys.auth,
            userAgent: request.headers.get("user-agent"),
        })
        .onConflictDoUpdate({
            target: pushSubscription.endpoint,
            set: {
                userId,
                p256dh: result.data.keys.p256dh,
                auth: result.data.keys.auth,
                userAgent: request.headers.get("user-agent"),
                lastWirdReminderDate: null,
                updatedAt: new Date(),
            },
        });

    return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ success: false }, { status: 401 });
    }

    const result = z
        .object({ endpoint: z.string().url() })
        .safeParse(await request.json());
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
