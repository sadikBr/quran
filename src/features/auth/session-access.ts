import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import db from "@/drizzle/db";
import { session, user } from "@/drizzle/schema";

function denied(suspended: boolean) {
    return new APIError("FORBIDDEN", {
        code: suspended ? "ACCOUNT_SUSPENDED" : "SESSION_REVOKED",
        message: suspended
            ? "This account is suspended. Contact the app administrator."
            : "Please sign in again.",
    });
}

export async function beforeSessionCreate(value: { userId: string }) {
    const [account] = await db
        .select({ suspendedAt: user.suspendedAt })
        .from(user)
        .where(eq(user.id, value.userId));
    if (!account || account.suspendedAt)
        throw denied(Boolean(account?.suspendedAt));
}

export async function afterSessionCreate(value: {
    id: string;
    userId: string;
    createdAt: Date;
}) {
    // Serialize with admin actions so a sign-in already in flight cannot revive a revoked session.
    const blocked = await db.transaction(async (tx) => {
        const [account] = await tx
            .select()
            .from(user)
            .where(eq(user.id, value.userId))
            .for("update");
        if (
            !account ||
            account.suspendedAt ||
            (account.sessionsRevokedAt &&
                value.createdAt <= account.sessionsRevokedAt)
        ) {
            await tx.delete(session).where(eq(session.id, value.id));
            return { suspended: Boolean(account?.suspendedAt) };
        }
        return null;
    });
    if (blocked) throw denied(blocked.suspended);
}
