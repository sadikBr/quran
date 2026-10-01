import { relations, sql } from "drizzle-orm";
import {
    boolean,
    check,
    index,
    integer,
    jsonb,
    pgTable,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { createdAt, id, updatedAt } from "../helpers";
import { user } from "./auth-schema";

export const memorizationGroup = pgTable(
    "memorization_group",
    {
        id,
        name: text("name").notNull(),
        description: text("description"),
        inviteCode: text("invite_code").notNull(),
        createdById: text("created_by_id")
            .notNull()
            .references(() => user.id, { onDelete: "restrict" }),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("memorization_group_invite_code_idx").on(table.inviteCode),
        index("memorization_group_creator_idx").on(table.createdById),
    ],
);

export const groupMember = pgTable(
    "group_member",
    {
        id,
        groupId: text("group_id")
            .notNull()
            .references(() => memorizationGroup.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        role: text("role", { enum: ["supervisor", "member"] })
            .notNull()
            .default("member"),
        isReviewer: boolean("is_reviewer").notNull().default(false),
        reviewerScope: text("reviewer_scope", { enum: ["all", "supervisor"] })
            .notNull()
            .default("all"),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_member_group_user_idx").on(
            table.groupId,
            table.userId,
        ),
        index("group_member_user_idx").on(table.userId),
        check(
            "group_member_reviewer_scope_check",
            sql`${table.reviewerScope} in ('all', 'supervisor')`,
        ),
        check(
            "group_member_role_check",
            sql`${table.role} in ('supervisor', 'member')`,
        ),
        uniqueIndex("group_single_supervisor_idx")
            .on(table.groupId)
            .where(sql`${table.role} = 'supervisor'`),
    ],
);

export const groupMeeting = pgTable(
    "group_meeting",
    {
        id,
        groupId: text("group_id")
            .notNull()
            .references(() => memorizationGroup.id, { onDelete: "cascade" }),
        hostUserId: text("host_user_id").references(() => user.id, {
            onDelete: "restrict",
        }),
        roomName: text("room_name").notNull(),
        rescheduledOccurrences: jsonb("rescheduled_occurrences")
            .$type<Array<{ from: string; to: string }>>()
            .notNull()
            .default([]),
        timezone: text("timezone").notNull(),
        activeWindowMinutes: integer("active_window_minutes")
            .notNull()
            .default(180),
        hostActiveUntil: timestamp("host_active_until", {
            withTimezone: true,
        }),
        enabled: boolean("enabled").notNull().default(true),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_meeting_group_idx").on(table.groupId),
        uniqueIndex("group_meeting_room_idx").on(table.roomName),
        index("group_meeting_host_idx").on(table.hostUserId),
    ],
);

export const groupMeetingSchedule = pgTable(
    "group_meeting_schedule",
    {
        id,
        meetingId: text("meeting_id")
            .notNull()
            .references(() => groupMeeting.id, { onDelete: "cascade" }),
        weekday: integer("weekday").notNull(),
        localTime: text("local_time").notNull(),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_meeting_schedule_slot_idx").on(
            table.meetingId,
            table.weekday,
            table.localTime,
        ),
        index("group_meeting_schedule_meeting_idx").on(table.meetingId),
    ],
);

export const groupMeetingSession = pgTable(
    "group_meeting_session",
    {
        id,
        meetingId: text("meeting_id")
            .notNull()
            .references(() => groupMeeting.id, { onDelete: "cascade" }),
        scheduledStartsAt: timestamp("scheduled_starts_at", {
            withTimezone: true,
        }).notNull(),
        scheduledEndsAt: timestamp("scheduled_ends_at", {
            withTimezone: true,
        }).notNull(),
        startedAt: timestamp("started_at", { withTimezone: true }),
        endedAt: timestamp("ended_at", { withTimezone: true }),
        cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
        finalizedAt: timestamp("finalized_at", { withTimezone: true }),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_meeting_session_occurrence_idx").on(
            table.meetingId,
            table.scheduledStartsAt,
        ),
        index("group_meeting_session_meeting_idx").on(table.meetingId),
    ],
);

export const groupMeetingAttendance = pgTable(
    "group_meeting_attendance",
    {
        id,
        sessionId: text("session_id")
            .notNull()
            .references(() => groupMeetingSession.id, { onDelete: "cascade" }),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        joinedAt: timestamp("joined_at", { withTimezone: true }),
        activeJoinedAt: timestamp("active_joined_at", { withTimezone: true }),
        lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
        leftAt: timestamp("left_at", { withTimezone: true }),
        attendedSeconds: integer("attended_seconds").notNull().default(0),
        status: text("status").notNull().default("present"),
        excuse: text("excuse"),
        createdAt,
        updatedAt,
    },
    (table) => [
        uniqueIndex("group_meeting_attendance_member_idx").on(
            table.sessionId,
            table.userId,
        ),
        index("group_meeting_attendance_session_idx").on(table.sessionId),
        index("group_meeting_attendance_user_idx").on(table.userId),
    ],
);

export const memorizationGroupRelations = relations(
    memorizationGroup,
    ({ one, many }) => ({
        creator: one(user, {
            fields: [memorizationGroup.createdById],
            references: [user.id],
        }),
        members: many(groupMember),
        meeting: one(groupMeeting),
    }),
);

export const groupMemberRelations = relations(groupMember, ({ one }) => ({
    group: one(memorizationGroup, {
        fields: [groupMember.groupId],
        references: [memorizationGroup.id],
    }),
    user: one(user, {
        fields: [groupMember.userId],
        references: [user.id],
    }),
}));

export const groupMeetingRelations = relations(
    groupMeeting,
    ({ one, many }) => ({
        group: one(memorizationGroup, {
            fields: [groupMeeting.groupId],
            references: [memorizationGroup.id],
        }),
        host: one(user, {
            fields: [groupMeeting.hostUserId],
            references: [user.id],
        }),
        schedule: many(groupMeetingSchedule),
        sessions: many(groupMeetingSession),
    }),
);

export const groupMeetingSessionRelations = relations(
    groupMeetingSession,
    ({ one, many }) => ({
        meeting: one(groupMeeting, {
            fields: [groupMeetingSession.meetingId],
            references: [groupMeeting.id],
        }),
        attendance: many(groupMeetingAttendance),
    }),
);

export const groupMeetingAttendanceRelations = relations(
    groupMeetingAttendance,
    ({ one }) => ({
        session: one(groupMeetingSession, {
            fields: [groupMeetingAttendance.sessionId],
            references: [groupMeetingSession.id],
        }),
        member: one(user, {
            fields: [groupMeetingAttendance.userId],
            references: [user.id],
        }),
    }),
);

export const groupMeetingScheduleRelations = relations(
    groupMeetingSchedule,
    ({ one }) => ({
        meeting: one(groupMeeting, {
            fields: [groupMeetingSchedule.meetingId],
            references: [groupMeeting.id],
        }),
    }),
);
