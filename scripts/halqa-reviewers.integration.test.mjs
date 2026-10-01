// Opt-in; use an EMPTY disposable PostgreSQL database ending in _reviewer_tests.
// Runs the real migrations, permissions, queue, review writes and reviewer management.
import { expect, mock, test } from "bun:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const target = process.env.REVIEWER_TEST_DATABASE_URL;
const run = target ? test : test.skip;

run(
    "halqa review scopes, universal self-review prohibition, revocation and concurrent decisions",
    async () => {
        const url = new URL(target);
        if (!url.pathname.endsWith("_reviewer_tests"))
            throw new Error("Use a disposable _reviewer_tests database.");
        const client = new pg.Client({ connectionString: target });
        await client.connect();
        let appDb;
        try {
            const existing = await client.query(
                "select tablename from pg_tables where schemaname = 'public'",
            );
            if (existing.rows.length)
                throw new Error(
                    "Test database must be empty; existing data is never erased.",
                );
            await migrate(drizzle(client), {
                migrationsFolder: "src/drizzle/migrations",
            });
            Object.assign(process.env, {
                DB_HOST: url.hostname,
                DB_PORT: url.port || "5432",
                DB_NAME: url.pathname.slice(1),
                DB_USER: decodeURIComponent(url.username),
                DB_PASSWORD: decodeURIComponent(url.password),
                PRODUCTION_URLS: "http://localhost:3000",
            });
            let caller = "supervisor";
            mock.module("server-only", () => ({}));
            mock.module("next/headers", () => ({
                headers: async () => new Headers(),
            }));
            mock.module("next/cache", () => ({ revalidatePath() {} }));
            mock.module("next/server", () => ({ after() {} }));
            mock.module("../src/features/auth/auth", () => ({
                auth: {
                    api: {
                        getSession: async () =>
                            caller ? { user: { id: caller } } : null,
                    },
                },
            }));
            const { default: db } = await import("../src/drizzle/db");
            appDb = db;
            const { setGroupReviewer, removeGroupMember } = await import(
                "../src/features/groups/server/manage-group"
            );
            const { default: queue } = await import(
                "../src/features/groups/server/get-review-queue"
            );
            const { default: inspect } = await import(
                "../src/features/groups/server/get-assignment-review"
            );
            const { default: review } = await import(
                "../src/features/groups/server/review-member-assignment"
            );
            const { default: getAssignments } = await import(
                "../src/features/groups/server/get-group-assignments"
            );
            const { getGroupForUser } = await import(
                "../src/features/groups/server/get-groups"
            );
            for (const id of [
                "supervisor",
                "reviewer",
                "specialist",
                "member",
                "outsider",
            ])
                await client.query(
                    'insert into "user" (id,name,email) values ($1,$1,$2)',
                    [id, `${id}@example.test`],
                );
            for (const id of ["circle", "other"])
                await client.query(
                    "insert into memorization_group (id,name,invite_code,created_by_id,is_active) values ($1,$1,$1,'supervisor',true)",
                    [id],
                );
            for (const id of ["supervisor", "reviewer", "specialist", "member"])
                await client.query(
                    "insert into group_member (id,group_id,user_id,role) values ($1,'circle',$1,$2)",
                    [id, id === "supervisor" ? "supervisor" : "member"],
                );
            await client.query(
                "insert into group_member (id,group_id,user_id,role) values ('outsider','other','outsider','supervisor')",
            );
            await client.query(
                "insert into group_meeting (id,group_id,host_user_id,room_name,timezone) values ('meeting','circle','supervisor','test-room','UTC')",
            );
            await client.query(
                "insert into group_meeting_schedule (id,meeting_id,weekday,local_time) values ('schedule','meeting',1,'12:00')",
            );
            const startsAt = new Date(Date.now() - 60_000);
            const endsAt = new Date(Date.now() + 3600_000);
            const occurrence = startsAt.toISOString();
            await client.query(
                "insert into group_meeting_session (id,meeting_id,scheduled_starts_at,scheduled_ends_at,started_at) values ('session','meeting',$1,$2,$1)",
                [startsAt, endsAt],
            );
            for (const id of ["supervisor", "reviewer", "specialist", "member"])
                await client.query(
                    "insert into group_meeting_attendance (id,session_id,user_id,joined_at,active_joined_at,last_seen_at) values ($1,'session',$1,$2,$2,now())",
                    [id, startsAt],
                );
            async function assignment(
                id,
                assignee,
                groupId = "circle",
                status = "submitted",
            ) {
                await client.query(
                    "insert into practice_assignment (id,group_id,assignee_id,assigned_by_id,kind,riwayah,start_surah_number,start_ayah_number,end_surah_number,end_ayah_number,status,due_at) values ($1,$2,$3,'supervisor','memorization','hafs',1,1,1,7,$4,$5)",
                    [id, groupId, assignee, status, startsAt],
                );
            }
            for (const id of ["supervisor", "reviewer", "specialist", "member"])
                await assignment(`work-${id}`, id);
            await assignment("other-work", "outsider", "other");
            const save = (id, decision = "completed") =>
                review({
                    groupId: "circle",
                    assignmentId: id,
                    occurrence,
                    decision,
                });
            const grant = (
                reviewerRole = "all",
                membershipId = "reviewer",
                groupId = "circle",
            ) => setGroupReviewer({ groupId, membershipId, reviewerRole });
            const ids = async (userId) =>
                (await queue("circle", userId, occurrence))
                    .map((r) => r.id)
                    .sort();
            const { default: agenda } = await import(
                "../src/features/groups/server/get-meeting-agenda"
            );
            const agendaFor = (userId) =>
                agenda({
                    groupId: "circle",
                    requestingUserId: userId,
                    occurrenceStartsAt: startsAt,
                    active: true,
                });
            expect(
                (await getGroupForUser("circle", "reviewer")).isReviewer,
            ).toBe(false);
            expect(await ids("member")).toEqual([]);
            expect(
                await inspect("circle", "work-supervisor", "member"),
            ).toBeNull();
            expect(
                await inspect("circle", "work-member", "outsider"),
            ).toBeNull();
            expect(
                (await inspect("circle", "work-member", "member")).canReview,
            ).toBe(false);
            expect(
                (await getAssignments("circle", "member", true)).map(
                    (r) => r.id,
                ),
            ).toEqual(["work-member"]);
            expect(
                (await agendaFor("member")).members.map((r) => r.userId),
            ).toEqual(["member"]);
            caller = "member";
            expect((await grant()).success).toBe(false);
            expect((await save("work-supervisor")).success).toBe(false);
            caller = "supervisor";
            expect((await grant()).success).toBe(true);
            expect((await grant("supervisor", "specialist")).success).toBe(
                true,
            );
            expect((await grant("all", "outsider")).success).toBe(false);
            expect((await grant("all", "supervisor")).success).toBe(false);
            expect((await grant("invalid")).success).toBe(false);
            // Old clients cannot accidentally broaden access with the former boolean payload.
            expect(
                (
                    await setGroupReviewer({
                        groupId: "circle",
                        membershipId: "specialist",
                        isReviewer: true,
                    })
                ).success,
            ).toBe(false);
            expect(
                (await getGroupForUser("circle", "specialist")).reviewerScope,
            ).toBe("supervisor");
            expect(await ids("reviewer")).toEqual([
                "work-member",
                "work-specialist",
                "work-supervisor",
            ]);
            expect(await ids("specialist")).toEqual(["work-supervisor"]);
            expect(await ids("supervisor")).toEqual([
                "work-member",
                "work-reviewer",
                "work-specialist",
            ]);
            expect(
                (await getAssignments("circle", "specialist", true))
                    .map((r) => r.id)
                    .sort(),
            ).toEqual(["work-specialist", "work-supervisor"]);
            expect(
                (await agendaFor("specialist")).members
                    .map((r) => r.userId)
                    .sort(),
            ).toEqual(["specialist", "supervisor"]);
            expect(
                (await agendaFor("specialist")).members
                    .filter((r) => r.canReview)
                    .map((r) => r.userId),
            ).toEqual(["supervisor"]);
            expect(
                await inspect("circle", "work-member", "specialist"),
            ).toBeNull();
            expect(
                (await inspect("circle", "work-supervisor", "specialist"))
                    .canReview,
            ).toBe(true);
            expect(await inspect("other", "other-work", "reviewer")).toBeNull();
            // Nobody may self-review, for any decision, even with a forged peer attribution.
            for (const userId of [
                "supervisor",
                "reviewer",
                "specialist",
                "member",
            ]) {
                caller = userId;
                for (const decision of [
                    "completed",
                    "needs_revision",
                    "not_completed",
                ]) {
                    expect(
                        (
                            await review({
                                groupId: "circle",
                                assignmentId: `work-${userId}`,
                                occurrence,
                                decision,
                                reviewMethod: "peer",
                                reviewedById: "outsider",
                            })
                        ).success,
                    ).toBe(false);
                }
                expect(
                    (
                        await client.query(
                            "select status,reviewed_by_id from practice_assignment where id=$1",
                            [`work-${userId}`],
                        )
                    ).rows[0],
                ).toEqual({ status: "submitted", reviewed_by_id: null });
            }
            caller = "specialist";
            expect((await grant("all", "member")).success).toBe(false);
            expect((await save("work-member")).success).toBe(false);
            expect(
                (
                    await removeGroupMember({
                        groupId: "circle",
                        membershipId: "member",
                    })
                ).success,
            ).toBe(false);
            expect((await save("work-supervisor")).success).toBe(true);
            let saved = (
                await client.query(
                    "select reviewed_by_id,review_method from practice_assignment where id='work-supervisor'",
                )
            ).rows[0];
            expect(saved).toEqual({
                reviewed_by_id: "specialist",
                review_method: "peer",
            });
            caller = "reviewer";
            expect((await save("work-member")).success).toBe(true);
            caller = "supervisor";
            expect((await save("work-reviewer")).success).toBe(true);
            // A general reviewer downgraded while a screen is open loses access on save.
            await assignment("revoked-work", "member");
            expect(
                (await inspect("circle", "revoked-work", "reviewer")).canReview,
            ).toBe(true);
            expect((await grant("supervisor")).success).toBe(true);
            caller = "reviewer";
            expect(
                await inspect("circle", "revoked-work", "reviewer"),
            ).toBeNull();
            expect((await save("revoked-work")).success).toBe(false);
            caller = "supervisor";
            expect((await grant("none")).success).toBe(true);
            caller = "reviewer";
            expect(await ids("reviewer")).toEqual([]);
            expect((await save("revoked-work")).success).toBe(false);
            caller = "supervisor";
            expect((await grant()).success).toBe(true);
            caller = "reviewer";
            const concurrent = await Promise.all([
                save("revoked-work"),
                save("revoked-work"),
            ]);
            expect(concurrent.filter((r) => r.success)).toHaveLength(1);
            await assignment("revision", "member");
            expect((await save("revision", "needs_revision")).success).toBe(
                true,
            );
            saved = (
                await client.query(
                    "select status,review_method,reviewed_by_id,due_at from practice_assignment where id='revision'",
                )
            ).rows[0];
            expect(saved.status).toBe("needs_revision");
            expect(saved.review_method).toBe("peer");
            expect(saved.reviewed_by_id).toBe("reviewer");
            expect(saved.due_at > startsAt).toBe(true);
            const assessments = (
                await client.query(
                    "select assignment_id, method, outcome, reviewer_id, source_key from memorization_assessment order by assignment_id",
                )
            ).rows;
            expect(assessments).toHaveLength(5);
            expect(
                assessments.filter(
                    (row) => row.assignment_id === "revoked-work",
                ),
            ).toHaveLength(1);
            expect(
                assessments.find((row) => row.assignment_id === "revision"),
            ).toMatchObject({
                method: "peer",
                outcome: "needs_revision",
                reviewer_id: "reviewer",
            });
            expect(
                assessments.find(
                    (row) => row.assignment_id === "work-supervisor",
                ),
            ).toMatchObject({
                method: "peer",
                outcome: "confirmed",
                reviewer_id: "specialist",
                source_key: `peer:work-supervisor:${occurrence}`,
            });
            await assignment("disconnected", "member");
            await client.query(
                "update group_meeting_attendance set last_seen_at=now()-interval '2 minutes' where user_id='reviewer'",
            );
            expect((await save("disconnected")).success).toBe(false);
            await client.query(
                "update group_meeting_attendance set last_seen_at=now() where user_id='reviewer'",
            );
            caller = "supervisor";
            expect(
                (
                    await removeGroupMember({
                        groupId: "circle",
                        membershipId: "reviewer",
                    })
                ).success,
            ).toBe(true);
            caller = "reviewer";
            expect((await save("disconnected")).success).toBe(false);
            expect(await ids("reviewer")).toEqual([]);
            // Supervisor-only access follows the current role, never the old supervisor's identity.
            await assignment("old-supervisor-work", "supervisor");
            await assignment("new-supervisor-work", "member");
            await client.query("begin");
            await client.query(
                "select id from memorization_group where id='circle' for update",
            );
            await client.query(
                "update group_member set role='member' where id='supervisor'",
            );
            await client.query(
                "update group_member set role='supervisor' where id='member'",
            );
            await client.query("commit");
            caller = "specialist";
            expect(
                await inspect("circle", "old-supervisor-work", "specialist"),
            ).toBeNull();
            expect((await save("old-supervisor-work")).success).toBe(false);
            expect(
                (await inspect("circle", "new-supervisor-work", "specialist"))
                    .canReview,
            ).toBe(true);
            expect((await save("new-supervisor-work")).success).toBe(true);
            caller = null;
            expect((await grant()).success).toBe(false);
            expect((await save("disconnected")).success).toBe(false);
        } finally {
            await client.end();
            await appDb?.$client.end();
        }
    },
    30_000,
);
