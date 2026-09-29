// Run only against a dedicated disposable database ending in "_role_tests".
// Apply migrations first. Never loads a database target from the app's .env.
import { expect, mock, test } from "bun:test";
import pg from "pg";
import { bootstrapAdmin } from "./bootstrap-admin.mjs";

const target = process.env.ADMIN_TEST_DATABASE_URL;
const run = target ? test : test.skip;

run(
    "real database: bootstrap, auth, circle ownership, host transfer and deletion boundaries",
    async () => {
        const url = new URL(target);
        if (!url.pathname.endsWith("_role_tests"))
            throw new Error("Use a dedicated database ending in _role_tests.");
        Object.assign(process.env, {
            DB_HOST: url.hostname,
            DB_PORT: url.port || "5432",
            DB_NAME: url.pathname.slice(1),
            DB_USER: decodeURIComponent(url.username),
            DB_PASSWORD: decodeURIComponent(url.password),
            PRODUCTION_URLS: "http://localhost:3000",
            BETTER_AUTH_URL: "http://localhost:3000",
            BETTER_AUTH_SECRET:
                "isolated-integration-secret-at-least-32-characters",
            PGSSLMODE: "disable",
        });
        let requestHeaders = new Headers();
        mock.module("server-only", () => ({}));
        mock.module("next/headers", () => ({
            headers: async () => requestHeaders,
        }));
        mock.module("next/cache", () => ({ revalidatePath() {} }));
        const client = new pg.Client({ connectionString: target, ssl: false });
        await client.connect();
        let applicationDb;
        try {
            const { rows } = await client.query(
                'select count(*)::int as total from "user"',
            );
            if (rows[0].total)
                throw new Error(
                    "The test database must be empty; tests never erase existing data.",
                );
            const initial = {
                PLATFORM_ADMIN_EMAIL: "owner@example.test",
                PLATFORM_ADMIN_NAME: "Owner",
                PLATFORM_ADMIN_PASSWORD: "isolated-owner-password-123",
            };
            const secondClient = new pg.Client({
                connectionString: target,
                ssl: false,
            });
            await secondClient.connect();
            try {
                const results = await Promise.all([
                    bootstrapAdmin(client, initial),
                    bootstrapAdmin(secondClient, initial),
                ]);
                expect(results.sort()).toEqual(["created", "exists"]);
            } finally {
                await secondClient.end();
            }
            const { auth } = await import("../src/features/auth/auth");
            const { default: db } = await import("../src/drizzle/db");
            applicationDb = db;
            const { default: createGroup } = await import(
                "../src/features/groups/server/create-group"
            );
            const { default: joinGroup } = await import(
                "../src/features/groups/server/join-group"
            );
            const { default: saveMeeting } = await import(
                "../src/features/groups/server/save-group-meeting"
            );
            const { leaveGroup, removeGroupMember } = await import(
                "../src/features/groups/server/manage-group"
            );
            const {
                replaceSupervisor,
                deleteCircle,
                searchSupervisorCandidates,
                updateCircle,
            } = await import("../src/features/admin/server/actions");
            const { canSuperviseCircle } = await import(
                "../src/features/auth/permissions"
            );
            const password = "isolated-member-password-123";
            async function register(name, email) {
                const result = await auth.api.signUpEmail({
                    body: { name, email, password },
                });
                return result.user;
            }
            async function login(email, secret = password) {
                const response = await auth.api.signInEmail({
                    body: { email, password: secret },
                    asResponse: true,
                });
                expect(response.status).toBe(200);
                const cookies = response.headers
                    .getSetCookie()
                    .map((value) => value.split(";")[0])
                    .join("; ");
                requestHeaders = new Headers({ cookie: cookies });
                return requestHeaders;
            }
            const supervisor = await register(
                "Supervisor",
                "supervisor@example.test",
            );
            const member = await register("Member", "member@example.test");
            // Public role escalation must either reject the request or retain member privileges.
            try {
                await auth.api.signUpEmail({
                    body: {
                        name: "Attacker",
                        email: "attacker@example.test",
                        password,
                        role: "admin",
                    },
                });
            } catch {}
            const roleCheck = await client.query(
                'select role from "user" where email = $1',
                ["attacker@example.test"],
            );
            expect(roleCheck.rows.every((row) => row.role === "member")).toBe(
                true,
            );
            const input = {
                name: "Test circle",
                supervisorId: supervisor.id,
                timezone: "Africa/Casablanca",
                schedule: [{ weekday: 1, localTime: "20:00" }],
            };
            expect((await createGroup(input)).success).toBe(false); // no session
            await login(supervisor.email);
            expect((await createGroup(input)).success).toBe(false);
            expect(await searchSupervisorCandidates("member")).toEqual([]);
            await login(
                initial.PLATFORM_ADMIN_EMAIL,
                initial.PLATFORM_ADMIN_PASSWORD,
            );
            const adminHeaders = requestHeaders;
            const session = await auth.api.getSession({
                headers: requestHeaders,
            });
            expect(session.user.role).toBe("admin");
            const unassigned = await createGroup({
                ...input,
                name: "Unassigned circle",
                supervisorId: undefined,
            });
            expect(unassigned.success).toBe(true);
            const unassignedId = unassigned.groupId;
            const draftMeeting = (
                await client.query(
                    "select * from group_meeting where group_id = $1",
                    [unassignedId],
                )
            ).rows[0];
            expect(draftMeeting.host_user_id).toBeNull();
            expect(draftMeeting.enabled).toBe(false);
            expect(
                (
                    await client.query(
                        "select * from group_member where group_id = $1",
                        [unassignedId],
                    )
                ).rowCount,
            ).toBe(0);
            expect(
                (
                    await client.query(
                        "select * from group_meeting_schedule where meeting_id = $1",
                        [draftMeeting.id],
                    )
                ).rowCount,
            ).toBe(1);
            expect(
                (
                    await updateCircle({
                        groupId: unassignedId,
                        name: "Renamed circle",
                        description: "Updated description",
                    })
                ).success,
            ).toBe(true);
            const updatedCircle = (
                await client.query(
                    "select * from memorization_group where id = $1",
                    [unassignedId],
                )
            ).rows[0];
            expect(updatedCircle.name).toBe("Renamed circle");
            expect(updatedCircle.description).toBe("Updated description");
            await login(member.email);
            expect(
                (
                    await updateCircle({
                        groupId: unassignedId,
                        name: "Unauthorized edit",
                        description: "",
                    })
                ).success,
            ).toBe(false);
            expect(
                (
                    await replaceSupervisor({
                        groupId: unassignedId,
                        supervisorId: member.id,
                    })
                ).success,
            ).toBe(false);
            expect(
                (await joinGroup({ inviteCode: updatedCircle.invite_code }))
                    .success,
            ).toBe(true);
            const { getGroupMeetingForUser } = await import(
                "../src/features/groups/server/get-group-meeting"
            );
            expect(
                await getGroupMeetingForUser(unassignedId, member.id),
            ).toBeNull();
            requestHeaders = adminHeaders;
            expect(
                (
                    await replaceSupervisor({
                        groupId: unassignedId,
                        supervisorId: supervisor.id,
                    })
                ).success,
            ).toBe(true);
            const activatedMeeting = await getGroupMeetingForUser(
                unassignedId,
                member.id,
            );
            expect(activatedMeeting.hostUserId).toBe(supervisor.id);
            expect(activatedMeeting.enabled).toBe(true);
            expect(activatedMeeting.schedule).toEqual(input.schedule);
            expect(
                (
                    await deleteCircle({
                        groupId: unassignedId,
                        confirmation: updatedCircle.name,
                    })
                ).success,
            ).toBe(true);
            const group = await createGroup(input);
            expect(group.success).toBe(true);
            const groupId = group.groupId;
            const circle = (
                await client.query(
                    "select * from memorization_group where id = $1",
                    [groupId],
                )
            ).rows[0];
            expect(
                (await joinGroup({ inviteCode: circle.invite_code })).success,
            ).toBe(false);
            expect(
                (
                    await client.query(
                        "select * from group_member where group_id = $1",
                        [groupId],
                    )
                ).rows.map((row) => [row.user_id, row.role]),
            ).toEqual([[supervisor.id, "supervisor"]]);
            expect(await canSuperviseCircle(groupId, session.user.id)).toBe(
                false,
            );
            expect(
                (await searchSupervisorCandidates("Member")).map(
                    (row) => row.id,
                ),
            ).toContain(member.id);
            expect(
                (await createGroup({ ...input, supervisorId: session.user.id }))
                    .success,
            ).toBe(false);
            await expect(
                auth.api.deleteUser({
                    body: { password: initial.PLATFORM_ADMIN_PASSWORD },
                    headers: adminHeaders,
                }),
            ).rejects.toThrow();
            await login(member.email);
            expect(
                (await joinGroup({ inviteCode: circle.invite_code })).success,
            ).toBe(true);
            expect(
                (await replaceSupervisor({ groupId, supervisorId: member.id }))
                    .success,
            ).toBe(false);
            expect(
                (await deleteCircle({ groupId, confirmation: circle.name }))
                    .success,
            ).toBe(false);
            expect(
                (
                    await saveMeeting({
                        groupId,
                        timezone: "UTC",
                        schedule: input.schedule,
                    })
                ).success,
            ).toBe(false);
            await login(supervisor.email);
            expect((await leaveGroup({ groupId })).success).toBe(false);
            expect(
                (
                    await saveMeeting({
                        groupId,
                        timezone: "UTC",
                        schedule: input.schedule,
                    })
                ).success,
            ).toBe(true);
            await expect(
                auth.api.deleteUser({
                    body: { password },
                    headers: requestHeaders,
                }),
            ).rejects.toThrow();
            requestHeaders = adminHeaders;
            const other = await createGroup({
                ...input,
                name: "Other circle",
                supervisorId: member.id,
            });
            expect(await canSuperviseCircle(other.groupId, supervisor.id)).toBe(
                false,
            );
            await client.query(
                "update group_meeting set host_active_until = now() + interval '1 minute' where group_id = $1",
                [groupId],
            );
            expect(
                (await replaceSupervisor({ groupId, supervisorId: member.id }))
                    .reason,
            ).toBe("active_meeting");
            expect(
                (await deleteCircle({ groupId, confirmation: circle.name }))
                    .reason,
            ).toBe("active_meeting");
            await client.query(
                "update group_meeting set host_active_until = null where group_id = $1",
                [groupId],
            );
            const oldRoom = (
                await client.query(
                    "select room_name from group_meeting where group_id = $1",
                    [groupId],
                )
            ).rows[0].room_name;
            expect(
                (await replaceSupervisor({ groupId, supervisorId: member.id }))
                    .success,
            ).toBe(true);
            expect(await canSuperviseCircle(groupId, supervisor.id)).toBe(
                false,
            );
            expect(await canSuperviseCircle(groupId, member.id)).toBe(true);
            const meeting = (
                await client.query(
                    "select * from group_meeting where group_id = $1",
                    [groupId],
                )
            ).rows[0];
            expect(meeting.host_user_id).toBe(member.id);
            expect(meeting.room_name).not.toBe(oldRoom);
            await login(supervisor.email);
            expect(
                (
                    await saveMeeting({
                        groupId,
                        timezone: "UTC",
                        schedule: input.schedule,
                    })
                ).success,
            ).toBe(false);
            const targetMembership = (
                await client.query(
                    "select id from group_member where group_id = $1 and user_id = $2",
                    [groupId, member.id],
                )
            ).rows[0];
            expect(
                (
                    await removeGroupMember({
                        groupId,
                        membershipId: targetMembership.id,
                    })
                ).success,
            ).toBe(false);
            requestHeaders = adminHeaders;
            expect(
                (await deleteCircle({ groupId, confirmation: "wrong" }))
                    .success,
            ).toBe(false);
            expect(
                (await deleteCircle({ groupId, confirmation: circle.name }))
                    .success,
            ).toBe(true);
            expect(
                (
                    await client.query(
                        "select * from group_member where group_id = $1",
                        [groupId],
                    )
                ).rowCount,
            ).toBe(0);
            expect(
                (
                    await client.query(
                        "select action from admin_activity where group_id = $1 order by created_at",
                        [groupId],
                    )
                ).rows.map((row) => row.action),
            ).toEqual([
                "circle_created",
                "supervisor_changed",
                "circle_deleted",
            ]);
            await expect(
                client.query(
                    'insert into "user" (id, name, email, role) values ($1, $2, $3, $4)',
                    ["second-admin", "Second", "second@example.test", "admin"],
                ),
            ).rejects.toThrow();
            await expect(
                client.query(
                    "insert into group_member (id, group_id, user_id, role) values ($1, $2, $3, $4)",
                    [
                        "second-supervisor",
                        other.groupId,
                        supervisor.id,
                        "supervisor",
                    ],
                ),
            ).rejects.toThrow();
        } finally {
            await client.end();
            await applicationDb?.$client.end();
        }
    },
    30000,
);
