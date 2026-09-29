import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { and, eq } from "drizzle-orm";
import { env } from "@/data/env/server";
import db from "@/drizzle/db";
import { groupMember, userSettings, user as userTable } from "@/drizzle/schema";
import { DEFAULT_PREFERENCES } from "../settings/preferences";

export const auth = betterAuth({
    trustedOrigins: env.PRODUCTION_URLS.split(","),
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: ["admin", "member"],
                required: false,
                defaultValue: "member",
                input: false,
            },
        },
        changeEmail: {
            enabled: true,
            updateEmailWithoutVerification: true,
        },
        deleteUser: {
            enabled: true,
            beforeDelete: async (account) => {
                const [existing] = await db
                    .select({ role: userTable.role })
                    .from(userTable)
                    .where(eq(userTable.id, account.id));
                const [supervised] = await db
                    .select({ id: groupMember.id })
                    .from(groupMember)
                    .where(
                        and(
                            eq(groupMember.userId, account.id),
                            eq(groupMember.role, "supervisor"),
                        ),
                    )
                    .limit(1);
                if (existing?.role === "admin" || supervised) {
                    throw new APIError("FORBIDDEN", {
                        message:
                            "The platform admin cannot be deleted. Circle supervisors must be replaced before deleting their account.",
                    });
                }
            },
        },
    },
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await db
                        .insert(userSettings)
                        .values({
                            userId: user.id,
                            ...DEFAULT_PREFERENCES,
                        })
                        .onConflictDoNothing();
                },
            },
        },
    },
});
