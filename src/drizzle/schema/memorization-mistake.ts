import { sql } from "drizzle-orm";
import {
    check,
    index,
    integer,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const memorizationMistake = pgTable(
    "memorization_mistake",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        surahNumber: integer("surah_number").notNull(),
        ayahNumber: integer("ayah_number").notNull(),
        kind: text("kind", {
            enum: ["word", "continuation", "transition"],
        }).notNull(),
        note: text("note").notNull().default(""),
        occurrences: integer("occurrences").notNull().default(1),
        practiceCount: integer("practice_count").notNull().default(0),
        revision: integer("revision").notNull().default(1),
        reportedById: text("reported_by_id").references(() => user.id, {
            onDelete: "set null",
        }),
        resolvedAt: timestamp("resolved_at", { withTimezone: true }),
        lastOccurredAt: timestamp("last_occurred_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        uniqueIndex("memorization_mistake_reference_idx").on(
            t.userId,
            t.riwayah,
            t.surahNumber,
            t.ayahNumber,
            t.kind,
        ),
        index("memorization_mistake_user_idx").on(t.userId, t.resolvedAt),
        check(
            "memorization_mistake_reference_check",
            sql`${t.surahNumber} between 1 and 114 and ${t.ayahNumber} between 1 and 286`,
        ),
        check(
            "memorization_mistake_kind_check",
            sql`${t.kind} in ('word', 'continuation', 'transition')`,
        ),
        check(
            "memorization_mistake_riwayah_check",
            sql`${t.riwayah} in ('hafs', 'warsh')`,
        ),
        check(
            "memorization_mistake_note_check",
            sql`length(${t.note}) <= 1000`,
        ),
    ],
);

export const memorizationMistakeEvent = pgTable(
    "memorization_mistake_event",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        mistakeId: text("mistake_id")
            .notNull()
            .references(() => memorizationMistake.id, { onDelete: "cascade" }),
        action: text("action", {
            enum: ["noticed", "practised", "resolved", "reopened"],
        }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("memorization_mistake_event_user_idx").on(t.userId, t.createdAt),
        check(
            "memorization_mistake_event_action_check",
            sql`${t.action} in ('noticed', 'practised', 'resolved', 'reopened')`,
        ),
    ],
);
