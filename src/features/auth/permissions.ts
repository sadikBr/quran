import "server-only";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import db from "@/drizzle/db";
import { groupMember, user } from "@/drizzle/schema";
import { auth } from "./auth";

export async function isPlatformAdmin(userId: string) {
    const [account] = await db
        .select({ role: user.role })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);
    return account?.role === "admin";
}

export async function canSuperviseCircle(groupId: string, userId: string) {
    const [membership] = await db
        .select({ id: groupMember.id })
        .from(groupMember)
        .where(
            and(
                eq(groupMember.groupId, groupId),
                eq(groupMember.userId, userId),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .limit(1);
    return Boolean(membership);
}

export async function getPlatformAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !(await isPlatformAdmin(session.user.id))) return null;
    return session.user;
}

export async function requirePlatformAdmin() {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) redirect("/sign-in");
    if (!(await isPlatformAdmin(session.user.id))) redirect("/dashboard");
    return session.user;
}
