import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import db from "@/drizzle/db";
import { userSettings } from "@/drizzle/schema";
import { DEFAULT_PREFERENCES } from "../settings/preferences";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        changeEmail: {
            enabled: true,
            updateEmailWithoutVerification: true,
        },
        deleteUser: {
            enabled: true,
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
