import { relations, sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";

export const user = pgTable(
    "user",
    {
        id,

        name: text("name").notNull(),
        email: text("email").notNull().unique(),
        emailVerified: boolean("email_verified").default(false).notNull(),
        image: text("image"),
        role: text("role", { enum: ["admin", "member"] })
            .notNull()
            .default("member"),
        suspendedAt: timestamp("suspended_at", { withTimezone: true }),
        dataResetAt: timestamp("data_reset_at", { withTimezone: true }),
        sessionsRevokedAt: timestamp("sessions_revoked_at", {
            withTimezone: true,
        }),

        createdAt,
        updatedAt,
    },
    (table) => [
        check("user_role_check", sql`${table.role} in ('admin', 'member')`),
        check(
            "admin_not_suspended_check",
            sql`${table.role} <> 'admin' or ${table.suspendedAt} is null`,
        ),
        uniqueIndex("single_platform_admin_idx")
            .on(table.role)
            .where(sql`${table.role} = 'admin'`),
    ],
);

export const session = pgTable(
    "session",
    {
        id,

        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),

        createdAt,
        updatedAt,
    },
    (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
    "account",
    {
        id,

        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),

        createdAt,
        updatedAt,
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
    "verification",
    {
        id,

        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),

        createdAt,
        updatedAt,
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));
