// Opt-in: only a new, empty disposable database ending in _user_management_tests.
import { expect, test } from "bun:test";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import * as orm from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { z } from "zod";
import * as s from "../src/drizzle/schema";
import * as preferences from "../src/features/settings/preferences";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const target = process.env.USER_MANAGEMENT_TEST_DATABASE_URL;
const run = target ? test : test.skip;
run(
    "user management: real auth, isolated reset, suspension, revocation, protection, search and audit",
    async () => {
        const url = new URL(target);
        if (!url.pathname.endsWith("_user_management_tests"))
            throw Error(
                "Use a disposable database ending in _user_management_tests",
            );
        const pool = new pg.Pool({ connectionString: target });
        const db = drizzle(pool, { schema: s });
        try {
            const existing = await pool.query(
                "select count(*)::int n from information_schema.tables where table_schema = 'public'",
            );
            if (existing.rows[0].n) throw Error("Refusing a nonempty database");
            await migrate(db, { migrationsFolder: "src/drizzle/migrations" });
            const shared = {
                "server-only": {},
                "drizzle-orm": orm,
                "@/drizzle/db": db,
                "@/drizzle/schema": s,
            };
            const hooks = loadTypeScript(
                "src/features/auth/session-access.ts",
                { ...shared, "better-auth/api": { APIError } },
            );
            process.env.BETTER_AUTH_SECRET =
                "isolated-user-management-test-secret-123456789";
            process.env.BETTER_AUTH_URL = "http://localhost:55442";
            const { auth } = loadTypeScript("src/features/auth/auth.ts", {
                ...shared,
                "better-auth": { betterAuth },
                "better-auth/adapters/drizzle": { drizzleAdapter },
                "better-auth/api": { APIError },
                "@/data/env/server": {
                    env: { PRODUCTION_URLS: "http://localhost:55442" },
                },
                "../settings/preferences": preferences,
                "./session-access": hooks,
            });
            let headers = new Headers();
            const permissions = loadTypeScript(
                "src/features/auth/permissions.ts",
                {
                    ...shared,
                    "next/headers": { headers: async () => headers },
                    "next/navigation": {
                        redirect: () => {
                            throw Error("redirect");
                        },
                    },
                    "./auth": { auth },
                },
            );
            const service = loadTypeScript(
                "src/features/admin/server/user-service.ts",
                shared,
            );
            const invalidations = [];
            const { manageUser, previewUserReset } = loadTypeScript(
                "src/features/admin/server/user-actions.ts",
                {
                    ...shared,
                    zod: { z },
                    "next/cache": {
                        revalidatePath: (...args) => invalidations.push(args),
                    },
                    "@/features/auth/permissions": permissions,
                    "@/features/settings/preferences": preferences,
                    "./user-service": service,
                },
            );
            const password = "isolated-test-password-123";
            const circleActions = loadTypeScript(
                "src/features/admin/server/actions.ts",
                {
                    ...shared,
                    zod: { z },
                    "next/cache": { revalidatePath() {} },
                    "@/features/auth/permissions": permissions,
                },
            );
            const register = async (name, email) =>
                (
                    await auth.api.signUpEmail({
                        body: { name, email, password },
                    })
                ).user;
            const admin = await register("Admin", "admin@example.test");
            await db
                .update(s.user)
                .set({ role: "admin" })
                .where(orm.eq(s.user.id, admin.id));
            const alice = await register("Alice", "alice@example.test");
            const bob = await register("Bob", "bob@example.test");
            const supervisor = await register(
                "Supervisor",
                "supervisor@example.test",
            );
            const login = async (email) => {
                const response = await auth.api.signInEmail({
                    body: { email, password },
                    asResponse: true,
                });
                expect(response.status).toBe(200);
                return new Headers({
                    cookie: response.headers
                        .getSetCookie()
                        .map((v) => v.split(";")[0])
                        .join("; "),
                });
            };
            const adminHeaders = await login(admin.email);
            const aliceHeaders = await login(alice.email);
            const bobHeaders = await login(bob.email);
            const row = async (id) =>
                (
                    await db.select().from(s.user).where(orm.eq(s.user.id, id))
                )[0];
            const input = async (id, action, extra = {}) => ({
                userId: id,
                action,
                confirmation: (await row(id)).email,
                reason: "Requested support",
                expectedUpdatedAt: (await row(id)).updatedAt.toISOString(),
                ...extra,
            });
            const count = async (table, condition) =>
                (
                    await db
                        .select({ n: orm.sql`count(*)::int` })
                        .from(table)
                        .where(condition)
                )[0].n;
            const initialVersion = (
                await row(alice.id)
            ).updatedAt.toISOString();
            expect(await previewUserReset(alice.id)).toBeNull();
            expect(
                (await manageUser(await input(alice.id, "reset"))).reason,
            ).toBe("unauthorized");
            headers = bobHeaders;
            expect(
                (await manageUser(await input(alice.id, "suspend"))).reason,
            ).toBe("unauthorized");
            expect(await previewUserReset(alice.id)).toBeNull();
            headers = adminHeaders;
            for (const action of ["reset", "suspend", "reactivate", "sign_out"])
                expect(
                    (await manageUser(await input(admin.id, action))).reason,
                ).toBe("protected");
            expect(
                (
                    await manageUser(
                        await input(alice.id, "reset", {
                            confirmation: bob.email,
                        }),
                    )
                ).reason,
            ).toBe("confirmation");
            expect(
                (
                    await manageUser(
                        await input(alice.id, "reset", { reason: " " }),
                    )
                ).reason,
            ).toBe("invalid");
            expect((await row(alice.id)).updatedAt.toISOString()).toBe(
                initialVersion,
            );
            expect(await count(s.userAdminActivity)).toBe(0);

            await db.insert(s.memorizationGroup).values({
                id: "circle",
                name: "Learning circle",
                inviteCode: "invite",
                createdById: admin.id,
            });
            await db.insert(s.groupMember).values([
                { id: "alice-member", groupId: "circle", userId: alice.id },
                { id: "bob-member", groupId: "circle", userId: bob.id },
                {
                    id: "supervisor-member",
                    groupId: "circle",
                    userId: supervisor.id,
                    role: "supervisor",
                },
            ]);
            await db.insert(s.groupMeeting).values({
                id: "meeting",
                groupId: "circle",
                hostUserId: supervisor.id,
                roomName: "room",
                timezone: "Africa/Casablanca",
            });
            await db.insert(s.groupMeetingSession).values({
                id: "meeting-session",
                meetingId: "meeting",
                scheduledStartsAt: new Date(),
                scheduledEndsAt: new Date(Date.now() + 3600000),
            });
            for (const u of [alice, bob]) {
                const id = u.id;
                await db.insert(s.memorizationRecord).values({
                    userId: id,
                    setupAt: new Date(),
                    baselineRanges: [
                        {
                            start: { surahNumber: 1, ayahNumber: 1 },
                            end: { surahNumber: 1, ayahNumber: 7 },
                        },
                    ],
                });
                await db
                    .insert(s.userMemorizedHizb)
                    .values({ userId: id, hizbNumber: 1 });
                await db.insert(s.memorizationCorrectionRequest).values({
                    id: `request-${id}`,
                    userId: id,
                    reason: "Old request",
                });
                await db.insert(s.memorizationBaselineChange).values({
                    id: `change-${id}`,
                    userId: id,
                    previousHizbs: [],
                    hizbs: [1],
                    source: "admin",
                    requestId: `request-${id}`,
                });
                await db.insert(s.memorizationAssessment).values({
                    id: `assessment-${id}`,
                    userId: id,
                    assignmentId: `assignment-${id}`,
                    sourceKey: `source-${id}`,
                    method: "peer",
                    outcome: "confirmed",
                    reviewerId: alice.id,
                    riwayah: "hafs",
                    startSurahNumber: 1,
                    startAyahNumber: 1,
                    endSurahNumber: 1,
                    endAyahNumber: 7,
                });
                await db.insert(s.practiceAssignment).values({
                    id: `assignment-${id}`,
                    assigneeId: id,
                    assignedById: alice.id,
                    reviewedById: alice.id,
                    groupId: "circle",
                    kind: "memorization",
                    riwayah: "hafs",
                    startSurahNumber: 1,
                    startAyahNumber: 1,
                    endSurahNumber: 1,
                    endAyahNumber: 7,
                });
                await db.insert(s.learningSchedule).values({
                    userId: id,
                    revisionDays: [1],
                    memorizationDays: [2],
                });
                await db.insert(s.memorizationPlan).values({
                    userId: id,
                    quartersPerWeek: 1,
                    direction: "forward",
                    timezone: "Africa/Casablanca",
                    riwayah: "hafs",
                });
                await db.insert(s.memorizationWeek).values({
                    id: `memory-week-${id}`,
                    userId: id,
                    weekStart: "2026-10-05",
                    timezone: "Africa/Casablanca",
                    riwayah: "hafs",
                    days: [2],
                    quartersPerWeek: 1,
                });
                await db.insert(s.memorizationSession).values({
                    id: `memory-session-${id}`,
                    weekId: `memory-week-${id}`,
                    userId: id,
                    scheduledDate: "2026-10-06",
                    ordinal: 0,
                    quarters: [1],
                    startSurahNumber: 1,
                    startAyahNumber: 1,
                    endSurahNumber: 1,
                    endAyahNumber: 7,
                });
                await db.insert(s.revisionPlan).values({
                    userId: id,
                    days: [1],
                    quartersPerDay: 1,
                    timezone: "Africa/Casablanca",
                    riwayah: "hafs",
                });
                await db.insert(s.revisionWeek).values({
                    id: `revision-week-${id}`,
                    userId: id,
                    weekStart: "2026-10-05",
                    timezone: "Africa/Casablanca",
                    riwayah: "hafs",
                    days: [1],
                    quartersPerDay: 1,
                });
                await db.insert(s.revisionSession).values({
                    id: `revision-session-${id}`,
                    weekId: `revision-week-${id}`,
                    userId: id,
                    scheduledDate: "2026-10-05",
                    ordinal: 0,
                    quarters: [1],
                    startSurahNumber: 1,
                    startAyahNumber: 1,
                    endSurahNumber: 1,
                    endAyahNumber: 7,
                });
                await db
                    .insert(s.userReadingProgress)
                    .values({ userId: id, lastPageNumber: 10 });
                const wird = {
                    userId: id,
                    unit: "ayah",
                    amount: 7,
                    targetStartGlobalAyah: 1,
                    targetEndGlobalAyah: 7,
                    targetDate: "2026-10-03",
                };
                await db.insert(s.userWird).values(wird);
                await db.insert(s.userWirdHistory).values({
                    ...wird,
                    id: `wird-history-${id}`,
                    completedAt: new Date(),
                });
                await db.insert(s.userKhatmahPlan).values({
                    userId: id,
                    targetDate: "2026-12-01",
                    startGlobalAyah: 1,
                    currentGlobalAyah: 7,
                    measurement: "ayah",
                });
                await db.insert(s.userKhatmahHistory).values({
                    id: `khatmah-history-${id}`,
                    userId: id,
                    startedOn: "2026-01-01",
                    completedAt: new Date(),
                    plannedWeeks: 8,
                    actualDays: 56,
                    readingDays: 56,
                    measurement: "ayah",
                    startedGlobalAyah: 1,
                    wasRepeatable: false,
                });
                await db.insert(s.savedAyah).values({
                    userId: id,
                    globalAyahNumber: 1,
                    surahNumber: 1,
                    ayahNumber: 1,
                    pageNumber: 1,
                    surahName: "Fatiha",
                    arabicText: "test",
                    reflection: "private",
                });
                await db.insert(s.bookmarkCollection).values({
                    id: `collection-${id}`,
                    userId: id,
                    name: "Saved",
                    nameKey: "saved",
                });
                await db.insert(s.savedAyahCollection).values({
                    userId: id,
                    globalAyahNumber: 1,
                    collectionId: `collection-${id}`,
                });
                await db.insert(s.userGuideProgress).values({
                    userId: id,
                    guideId: "memorization",
                    completed: true,
                });
                await db.insert(s.groupMeetingAttendance).values({
                    id: `attendance-${id}`,
                    sessionId: "meeting-session",
                    userId: id,
                });
                await db.insert(s.pushSubscription).values({
                    id: `push-${id}`,
                    userId: id,
                    endpoint: `https://example.test/${id}`,
                    p256dh: "test",
                    auth: "test",
                });
                await db.insert(s.revisionReminderDelivery).values({
                    subscriptionId: `push-${id}`,
                    localDate: "2026-10-03",
                });
            }
            const bobBefore = await service.getUserDataSummary(bob.id);
            const otherAssignmentBefore = await db
                .select()
                .from(s.practiceAssignment)
                .where(orm.eq(s.practiceAssignment.assigneeId, bob.id));
            const preview = await previewUserReset(alice.id);
            expect(Object.values(preview.summary).every((n) => n > 0)).toBe(
                true,
            );
            expect(
                (await service.listManagedUsers("Alice", "all", 1)).count,
            ).toBe(1);
            expect((await service.listManagedUsers("%", "all", 1)).count).toBe(
                0,
            );
            expect(
                (await service.listManagedUsers("", "supervisors", 1)).users[0]
                    .id,
            ).toBe(supervisor.id);
            expect(
                (await service.getManagedUser(alice.id)).circles[0].adminPage,
            ).toBe(1);
            for (const action of ["reset", "suspend"])
                expect(
                    (await manageUser(await input(supervisor.id, action)))
                        .reason,
                ).toBe("supervisor");
            await db
                .update(s.groupMeeting)
                .set({ hostActiveUntil: new Date(Date.now() + 3600000) })
                .where(orm.eq(s.groupMeeting.id, "meeting"));
            expect(
                (await manageUser(await input(supervisor.id, "sign_out")))
                    .reason,
            ).toBe("active_meeting");
            await db
                .update(s.groupMeeting)
                .set({ hostActiveUntil: null })
                .where(orm.eq(s.groupMeeting.id, "meeting"));

            // Reset is atomic, prevents double submission, and preserves account credentials and other learners.
            const reset = await input(alice.id, "reset");
            const beforeAccount = await row(alice.id);
            expect(await manageUser(reset)).toEqual({ success: true });
            expect((await manageUser(reset)).reason).toBe("stale");
            const afterAccount = await row(alice.id);
            for (const key of ["id", "name", "email", "role", "createdAt"])
                expect(afterAccount[key]).toEqual(beforeAccount[key]);
            for (const group of service.personalData)
                for (const table of group.tables)
                    expect(
                        await count(table, orm.eq(table.userId, alice.id)),
                    ).toBe(table === s.userSettings ? 1 : 0);
            expect(
                await count(
                    s.practiceAssignment,
                    orm.eq(s.practiceAssignment.assigneeId, alice.id),
                ),
            ).toBe(0);
            expect(
                await count(
                    s.savedAyahCollection,
                    orm.eq(s.savedAyahCollection.userId, alice.id),
                ),
            ).toBe(0);
            expect(
                await count(
                    s.revisionReminderDelivery,
                    orm.eq(
                        s.revisionReminderDelivery.subscriptionId,
                        `push-${alice.id}`,
                    ),
                ),
            ).toBe(0);
            expect(await service.getUserDataSummary(bob.id)).toEqual(bobBefore);
            expect(
                await db
                    .select()
                    .from(s.practiceAssignment)
                    .where(orm.eq(s.practiceAssignment.assigneeId, bob.id)),
            ).toEqual(otherAssignmentBefore);
            expect(
                await auth.api.getSession({ headers: aliceHeaders }),
            ).toBeNull();
            expect(
                (await auth.api.getSession({ headers: bobHeaders })).user.id,
            ).toBe(bob.id);
            expect((await service.getUserActivity(1, alice.id))[0].action).toBe(
                "reset",
            );
            expect(
                (
                    await db
                        .select()
                        .from(s.userSettings)
                        .where(orm.eq(s.userSettings.userId, alice.id))
                )[0].riwayah,
            ).toBe(preferences.DEFAULT_PREFERENCES.riwayah);
            const freshHeaders = await login(alice.email);
            expect(
                (
                    await auth.api.getSession({ headers: freshHeaders })
                ).user.dataResetAt.getTime(),
            ).toBe(afterAccount.dataResetAt.getTime());
            expect(
                (await auth.api.getSession({ headers: freshHeaders })).user.id,
            ).toBe(alice.id);

            const suspendedBefore = await service.getUserDataSummary(bob.id);
            expect(await manageUser(await input(bob.id, "suspend"))).toEqual({
                success: true,
            });
            const suspendedAfter = await service.getUserDataSummary(bob.id);
            for (const key of Object.keys(suspendedBefore).filter(
                (k) => !["devices", "reminders"].includes(k),
            ))
                expect(suspendedAfter[key]).toBe(suspendedBefore[key]);
            expect(
                await auth.api.getSession({ headers: bobHeaders }),
            ).toBeNull();
            const denied = await auth.api.signInEmail({
                body: { email: bob.email, password },
                asResponse: true,
            });
            expect(denied.status).toBe(403);
            expect((await denied.json()).code).toBe("ACCOUNT_SUSPENDED");
            expect(
                await circleActions.searchSupervisorCandidates("Bob"),
            ).toEqual([]);
            expect(
                (
                    await circleActions.replaceSupervisor({
                        groupId: "circle",
                        supervisorId: bob.id,
                    })
                ).reason,
            ).toBe("invalid");
            expect(
                (await service.listManagedUsers("", "suspended", 1)).users.map(
                    (u) => u.id,
                ),
            ).toEqual([bob.id]);
            const accessBefore = await row(bob.id);
            expect(await manageUser(await input(bob.id, "reset"))).toEqual({
                success: true,
            });
            expect((await row(bob.id)).suspendedAt).toEqual(
                accessBefore.suspendedAt,
            );
            expect(await manageUser(await input(bob.id, "reactivate"))).toEqual(
                { success: true },
            );
            const bobRestored = await login(bob.email);
            expect(await manageUser(await input(bob.id, "sign_out"))).toEqual({
                success: true,
            });
            expect(
                await auth.api.getSession({ headers: bobRestored }),
            ).toBeNull();
            expect((await login(bob.email)).get("cookie")).toBeTruthy();

            // A session created before revocation but inserted afterward is rejected by the after hook.
            const lateSession = {
                id: "late-session",
                userId: alice.id,
                token: "late",
                createdAt: new Date(0),
                expiresAt: new Date(Date.now() + 3600000),
            };
            await db.insert(s.session).values(lateSession);
            await expect(
                hooks.afterSessionCreate(lateSession),
            ).rejects.toThrow();
            expect(
                await count(s.session, orm.eq(s.session.id, "late-session")),
            ).toBe(0);
            expect(
                (await service.getUserActivity(1)).map((e) => e.action),
            ).toEqual(["sign_out", "reactivate", "reset", "suspend", "reset"]);
            expect(invalidations.length).toBe(5);

            // Fail the audit insert to prove that an otherwise valid reset rolls back all deletions.
            await pool.query(
                "CREATE FUNCTION reject_user_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test audit failure'; END $$",
            );
            await pool.query(
                "CREATE TRIGGER reject_user_audit BEFORE INSERT ON user_admin_activity FOR EACH ROW EXECUTE FUNCTION reject_user_audit()",
            );
            await db
                .insert(s.userReadingProgress)
                .values({ userId: alice.id, lastPageNumber: 12 });
            const rollbackBefore = await service.getUserDataSummary(alice.id);
            await expect(
                manageUser(await input(alice.id, "reset")),
            ).rejects.toThrow();
            expect(await service.getUserDataSummary(alice.id)).toEqual(
                rollbackBefore,
            );
            await pool.query(
                "DROP TRIGGER reject_user_audit ON user_admin_activity",
            );
            await pool.query("DROP FUNCTION reject_user_audit()");
            // Public signup/update cannot set suspension or platform privileges.
            await expect(
                auth.api.updateUser({
                    headers: freshHeaders,
                    body: {
                        suspendedAt: null,
                        role: "admin",
                        sessionsRevokedAt: null,
                        name: "Alice updated",
                    },
                }),
            ).rejects.toThrow();
            expect((await row(alice.id)).role).toBe("member");
            expect((await row(alice.id)).sessionsRevokedAt).toBeTruthy();
            await expect(
                auth.api.updateUser({
                    headers: freshHeaders,
                    body: { dataResetAt: null },
                }),
            ).rejects.toThrow();
            expect((await row(alice.id)).dataResetAt).toEqual(
                afterAccount.dataResetAt,
            );
            await db.insert(s.user).values(
                Array.from({ length: 22 }, (_, i) => ({
                    id: `paged-${i}`,
                    name: `Learner ${i}`,
                    email: `learner-${i}@example.test`,
                    createdAt: new Date(
                        `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
                    ),
                })),
            );
            const firstPage = await service.listManagedUsers("", "all", 1);
            const secondPage = await service.listManagedUsers("", "all", 2);
            expect(firstPage.users).toHaveLength(20);
            expect(firstPage.hasMore).toBe(true);
            expect(secondPage.users).toHaveLength(5);
            expect(secondPage.hasMore).toBe(false);
            expect(
                new Set(
                    [...firstPage.users, ...secondPage.users].map((u) => u.id),
                ).size,
            ).toBe(25);
        } finally {
            await pool.end();
        }
    },
    60000,
);
