import { sql } from "drizzle-orm";
import {
    check,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

export const memorizationRecord = pgTable("memorization_record", {
    userId: text("user_id")
        .primaryKey()
        .references(() => user.id, { onDelete: "cascade" }),
    setupAt: timestamp("setup_at", { withTimezone: true }),
    baselineRiwayah: text("baseline_riwayah", { enum: ["hafs", "warsh"] })
        .notNull()
        .default("hafs"),
    revision: integer("revision").notNull().default(0),
    correctionUsedAt: timestamp("correction_used_at", { withTimezone: true }),
});

export const memorizationCorrectionRequest = pgTable(
    "memorization_correction_request",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        reason: text("reason").notNull(),
        status: text("status", {
            enum: ["pending", "approved", "declined", "used"],
        })
            .notNull()
            .default("pending"),
        reviewerId: text("reviewer_id").references(() => user.id, {
            onDelete: "set null",
        }),
        reviewNote: text("review_note"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
        reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
        usedAt: timestamp("used_at", { withTimezone: true }),
    },
    (table) => [
        uniqueIndex("memorization_correction_open_idx")
            .on(table.userId)
            .where(sql`${table.status} in ('pending', 'approved')`),
        index("memorization_correction_status_idx").on(
            table.status,
            table.createdAt,
        ),
        check(
            "memorization_correction_status_check",
            sql`${table.status} in ('pending', 'approved', 'declined', 'used')`,
        ),
    ],
);

export const memorizationBaselineChange = pgTable(
    "memorization_baseline_change",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        previousHizbs: jsonb("previous_hizbs").$type<number[]>().notNull(),
        hizbs: jsonb("hizbs").$type<number[]>().notNull(),
        source: text("source", {
            enum: ["setup", "initial", "admin"],
        }).notNull(),
        requestId: text("request_id").references(
            () => memorizationCorrectionRequest.id,
        ),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        index("memorization_baseline_user_idx").on(
            table.userId,
            table.createdAt,
        ),
    ],
);

// An immutable assessment snapshot survives assignment edits and deletion.
export const memorizationAssessment = pgTable(
    "memorization_assessment",
    {
        id: text("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        assignmentId: text("assignment_id").notNull(),
        sourceKey: text("source_key").notNull(),
        method: text("method", { enum: ["self", "peer"] }).notNull(),
        outcome: text("outcome", {
            enum: ["confirmed", "needs_revision"],
        }).notNull(),
        reviewerId: text("reviewer_id").references(() => user.id, {
            onDelete: "set null",
        }),
        riwayah: text("riwayah", { enum: ["hafs", "warsh"] }).notNull(),
        startSurahNumber: integer("start_surah_number").notNull(),
        startAyahNumber: integer("start_ayah_number").notNull(),
        endSurahNumber: integer("end_surah_number").notNull(),
        endAyahNumber: integer("end_ayah_number").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => [
        uniqueIndex("memorization_assessment_source_idx").on(table.sourceKey),
        index("memorization_assessment_user_idx").on(
            table.userId,
            table.createdAt,
        ),
        check(
            "memorization_assessment_method_check",
            sql`${table.method} in ('self', 'peer')`,
        ),
        check(
            "memorization_assessment_outcome_check",
            sql`${table.outcome} in ('confirmed', 'needs_revision')`,
        ),
        check(
            "memorization_assessment_riwayah_check",
            sql`${table.riwayah} in ('hafs', 'warsh')`,
        ),
        check(
            "memorization_assessment_range_check",
            sql`${table.startSurahNumber} between 1 and 114 and ${table.endSurahNumber} between 1 and 114 and ${table.startAyahNumber} between 1 and 286 and ${table.endAyahNumber} between 1 and 286 and (${table.startSurahNumber} * 1000 + ${table.startAyahNumber}) <= (${table.endSurahNumber} * 1000 + ${table.endAyahNumber})`,
        ),
    ],
);
