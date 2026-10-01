import { expect, test } from "bun:test";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { z } from "zod";
import * as schema from "../src/drizzle/schema";
import * as schedule from "../src/features/groups/server/meeting-schedule";
import * as revision from "../src/features/groups/server/revision-meeting";
import * as practiceTypes from "../src/features/practice/types";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

// Never reads the app's .env or uses its database. Refuse populated databases.
const target = process.env.ACTIVATION_TEST_DATABASE_URL;
const run = target ? test : test.skip;

run(
    "database: preparation, admin activation, workflow guards, pause and resume",
    async () => {
        if (!new URL(target).pathname.endsWith("_activation_tests"))
            throw new Error(
                "Use an empty disposable database ending in _activation_tests.",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema });
        const folder = await mkdtemp(join(tmpdir(), "circle-migrations-"));
        try {
            const existing = await pool.query(
                "select count(*)::int as count from information_schema.tables where table_schema = 'public'",
            );
            if (existing.rows[0].count)
                throw new Error("Refusing a nonempty test database.");
            await cp("src/drizzle/migrations", folder, { recursive: true });
            const journalPath = join(folder, "meta/_journal.json");
            const journal = JSON.parse(await readFile(journalPath, "utf8"));
            journal.entries = journal.entries.filter((entry) => entry.idx < 26);
            await writeFile(journalPath, JSON.stringify(journal));
            await migrate(db, { migrationsFolder: folder });
            await db.insert(schema.user).values([
                {
                    id: "admin",
                    name: "Admin",
                    email: "admin@example.test",
                    role: "admin",
                },
                {
                    id: "supervisor",
                    name: "Supervisor",
                    email: "supervisor@example.test",
                },
                { id: "member", name: "Member", email: "member@example.test" },
            ]);
            await pool.query(
                "insert into memorization_group (id, name, invite_code, created_by_id) values ('legacy', 'Legacy', 'LEGACY', 'admin')",
            );
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const [legacy] = await db
                .select()
                .from(schema.memorizationGroup)
                .where(orm.eq(schema.memorizationGroup.id, "legacy"));
            expect(legacy.isActive).toBe(true);
            expect(legacy.activeSince).toBeNull();

            let userId = null;
            const modules = {
                "server-only": {},
                "drizzle-orm": orm,
                zod: { z },
                "@/drizzle/db": db,
                "@/drizzle/schema": schema,
                "next/cache": { revalidatePath() {} },
                "next/headers": { headers: async () => new Headers() },
                "next/navigation": {
                    redirect() {
                        throw new Error("redirect");
                    },
                },
                "next/server": { after() {} },
                "@/features/auth/auth": {
                    auth: {
                        api: {
                            getSession: async () =>
                                userId ? { user: { id: userId } } : null,
                        },
                    },
                },
                "./meeting-schedule": schedule,
                "@/features/groups/server/meeting-schedule": schedule,
                "./revision-meeting": revision,
                "@/features/practice/types": practiceTypes,
                "../types": practiceTypes,
                "@/features/quran/server/get-surahs-meta": async () => [
                    { number: 1, numberOfAyahs: 7 },
                ],
                "@/features/quran/server/get-warsh-mushaf": {
                    getWarshChapters: async () => [],
                },
                "@/features/notifications/server/assignment-notifications": {
                    sendAssignmentNotification: async () => ({ sent: 0 }),
                },
            };
            modules["./auth"] = modules["@/features/auth/auth"];
            const permissions = loadTypeScript(
                "src/features/auth/permissions.ts",
                modules,
            );
            modules["@/features/auth/permissions"] = permissions;
            const workflow = loadTypeScript(
                "src/features/groups/server/group-workflow.ts",
                modules,
            );
            modules["./group-workflow"] = workflow;
            modules["@/features/groups/server/group-workflow"] = workflow;
            const meetingQuery = loadTypeScript(
                "src/features/groups/server/get-group-meeting.ts",
                modules,
            );
            modules["./get-group-meeting"] = meetingQuery;
            modules["@/features/groups/server/get-group-meeting"] =
                meetingQuery;
            const attendance = loadTypeScript(
                "src/features/groups/server/meeting-attendance.ts",
                modules,
            );
            modules["./meeting-attendance"] = attendance;
            const create = loadTypeScript(
                "src/features/groups/server/create-group.ts",
                modules,
            ).default;
            const activate = loadTypeScript(
                "src/features/admin/server/set-circle-active.ts",
                modules,
            ).default;
            const joinGroup = loadTypeScript(
                "src/features/groups/server/join-group.ts",
                modules,
            ).default;
            const saveSchedule = loadTypeScript(
                "src/features/groups/server/save-group-meeting.ts",
                modules,
            ).default;
            const plan = loadTypeScript(
                "src/features/groups/server/save-meeting-plan.ts",
                modules,
            ).default;
            const assign = loadTypeScript(
                "src/features/groups/server/create-member-assignment.ts",
                modules,
            ).default;
            const submit = loadTypeScript(
                "src/features/practice/server/submit-practice-assignment.ts",
                modules,
            ).default;
            const progress = loadTypeScript(
                "src/features/practice/server/update-practice-progress.ts",
                modules,
            ).default;
            const assignments = loadTypeScript(
                "src/features/practice/server/get-practice-assignment.ts",
                modules,
            );
            const expire = loadTypeScript(
                "src/features/groups/server/expire-unsubmitted-assignments.ts",
                modules,
            ).expireUnsubmittedAssignments;
            const nextMeeting = loadTypeScript(
                "src/features/groups/server/get-next-group-meeting.ts",
                modules,
            ).getNextGroupMeetingForUser;
            const reviews = loadTypeScript(
                "src/features/groups/server/live-review-context.ts",
                modules,
            );

            userId = "admin";
            const config = {
                name: "Preparing circle",
                supervisorId: "supervisor",
                timezone: "UTC",
                schedule: Array.from({ length: 7 }, (_, i) => ({
                    weekday: i + 1,
                    localTime: "20:00",
                })),
            };
            const created = await create(config);
            expect(created.success).toBe(true);
            const groupId = created.groupId;
            const getGroup = async () =>
                (
                    await db
                        .select()
                        .from(schema.memorizationGroup)
                        .where(orm.eq(schema.memorizationGroup.id, groupId))
                )[0];
            expect((await getGroup()).isActive).toBe(false);
            const unset = await create({
                ...config,
                name: "No supervisor",
                supervisorId: undefined,
            });
            expect(
                (await activate({ groupId: unset.groupId, isActive: true }))
                    .reason,
            ).toBe("supervisor_required");
            for (const caller of [null, "member", "supervisor"]) {
                userId = caller;
                expect(
                    (await activate({ groupId, isActive: true })).success,
                ).toBe(false);
            }
            userId = "member";
            expect(
                (await joinGroup({ inviteCode: (await getGroup()).inviteCode }))
                    .success,
            ).toBe(true);
            userId = "supervisor";
            expect(
                (
                    await saveSchedule({
                        groupId,
                        timezone: config.timezone,
                        schedule: config.schedule,
                    })
                ).success,
            ).toBe(true);
            const meeting = await meetingQuery.getGroupMeetingForUser(
                groupId,
                userId,
            );
            expect(schedule.calculateMeetingState(meeting).status).toBe(
                "disabled",
            );
            expect(await nextMeeting(userId)).toBeNull();
            const [due] = schedule.getUpcomingMeetingOccurrences({
                ...config,
                enabled: true,
            });
            const entry = {
                assigneeId: "member",
                kind: "memorization",
                start: { surahNumber: 1, ayahNumber: 1 },
                end: { surahNumber: 1, ayahNumber: 7 },
            };
            const planInput = {
                groupId,
                dueMeetingStartsAt: due,
                mode: "publish",
                entries: [entry],
            };
            expect((await plan(planInput)).success).toBe(false);
            expect(
                (await assign({ ...entry, groupId, dueMeetingStartsAt: due }))
                    .success,
            ).toBe(false);
            const yesterday = new Date(Date.now() - 86400000);
            expect(
                await attendance.ensureMeetingAttendanceRoster({
                    meetingId: meeting.id,
                    groupId,
                    scheduledStartsAt: yesterday,
                    scheduledEndsAt: new Date(yesterday.getTime() + 3600000),
                }),
            ).toBeNull();

            userId = "admin";
            expect((await activate({ groupId, isActive: true })).success).toBe(
                true,
            );
            expect((await activate({ groupId, isActive: true })).success).toBe(
                true,
            ); // idempotent
            expect((await getGroup()).activeSince).toBeInstanceOf(Date);
            expect(await nextMeeting("member")).not.toBeNull();
            // No recovery of occurrences that elapsed before activation.
            expect(
                await attendance.ensureMeetingAttendanceRoster({
                    meetingId: meeting.id,
                    groupId,
                    scheduledStartsAt: yesterday,
                    scheduledEndsAt: new Date(yesterday.getTime() + 3600000),
                }),
            ).toBeNull();
            userId = "supervisor";
            expect((await plan(planInput)).success).toBe(true);
            const [work] = await db
                .select()
                .from(schema.practiceAssignment)
                .where(orm.eq(schema.practiceAssignment.groupId, groupId));
            userId = "member";
            expect(
                (
                    await progress({
                        assignmentId: work.id,
                        surahNumber: 1,
                        ayahNumber: 3,
                    })
                ).success,
            ).toBe(true);
            expect(
                (await assignments.getAssignedPracticeAssignments("member"))
                    .length,
            ).toBe(1);

            // A started session blocks deactivation even after its host heartbeat expires.
            await db.insert(schema.groupMeetingSession).values({
                id: "live",
                meetingId: meeting.id,
                scheduledStartsAt: new Date(),
                scheduledEndsAt: new Date(Date.now() + 3600000),
                startedAt: new Date(),
            });
            userId = "admin";
            expect((await activate({ groupId, isActive: false })).reason).toBe(
                "active_meeting",
            );
            await db
                .update(schema.groupMeetingSession)
                .set({ startedAt: null })
                .where(orm.eq(schema.groupMeetingSession.id, "live"));
            expect((await activate({ groupId, isActive: false })).success).toBe(
                true,
            );
            expect((await getGroup()).isActive).toBe(false);
            expect(
                (
                    await db
                        .select()
                        .from(schema.groupMeetingSession)
                        .where(orm.eq(schema.groupMeetingSession.id, "live"))
                )[0].cancelledAt,
            ).not.toBeNull();
            userId = "member";
            expect(
                (await submit({ assignmentId: work.id, confirmed: true }))
                    .success,
            ).toBe(false);
            expect(
                (
                    await progress({
                        assignmentId: work.id,
                        surahNumber: 1,
                        ayahNumber: 7,
                    })
                ).success,
            ).toBe(false);
            expect(
                await assignments.getAssignedPracticeAssignments("member"),
            ).toEqual([]);
            expect(await assignments.default("member", work.id)).toBeNull();
            expect(
                await reviews.getLiveReviewContext(
                    groupId,
                    "supervisor",
                    new Date().toISOString(),
                ),
            ).toBeNull();
            expect(await nextMeeting("member")).toBeNull();

            // Legacy overdue work is neither penalized nor reset while inactive.
            await db
                .update(schema.practiceAssignment)
                .set({ dueAt: yesterday })
                .where(orm.eq(schema.practiceAssignment.id, work.id));
            expect((await expire(new Date())).expired).toBe(0);
            await attendance.finalizeEndedMeetingAttendance(
                new Date(Date.now() + 7 * 86400000),
            );
            const paused = (
                await db
                    .select()
                    .from(schema.practiceAssignment)
                    .where(orm.eq(schema.practiceAssignment.id, work.id))
            )[0];
            expect(paused.status).toBe("in_progress");
            expect(paused.progressAyahNumber).toBe(3);
            userId = "admin";
            expect((await activate({ groupId, isActive: true })).success).toBe(
                true,
            );
            const resumed = (
                await db
                    .select()
                    .from(schema.practiceAssignment)
                    .where(orm.eq(schema.practiceAssignment.id, work.id))
            )[0];
            expect(resumed.dueAt > new Date()).toBe(true);
            expect(resumed.progressAyahNumber).toBe(3);
            userId = "member";
            expect(
                (await submit({ assignmentId: work.id, confirmed: true }))
                    .success,
            ).toBe(true);
            const log = await db
                .select()
                .from(schema.adminActivity)
                .where(orm.eq(schema.adminActivity.groupId, groupId));
            expect(
                log.filter((entry) => entry.action === "circle_activated")
                    .length,
            ).toBe(2);
            expect(
                log.filter((entry) => entry.action === "circle_deactivated")
                    .length,
            ).toBe(1);
        } finally {
            await pool.end();
            await rm(folder, { recursive: true, force: true });
        }
    },
    30000,
);
