import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { circleNextStep } from "../src/features/groups/next-step";
import { presenceState } from "../src/features/groups/presence-state";

const base = {
    groupId: "circle",
    supervisor: false,
    live: false,
    scheduled: true,
    memberCount: 3,
    assignments: [],
};
const assignment = (status) => ({ id: "assignment", status, reviewNote: null });
const source = (path) => readFileSync(`src/${path}`, "utf8");
test("unexplained absence takes priority over preparation and awaiting recitation", () => {
    for (const status of ["submitted", "in_progress", "needs_revision"]) {
        expect(
            circleNextStep({
                ...base,
                pendingAbsence: true,
                assignments: [assignment(status)],
            }),
        ).toEqual({
            label: "provideExcuse",
            href: "/groups/circle#absence-excuse",
        });
    }
    expect(
        circleNextStep({ ...base, pendingAbsence: true, live: true }).label,
    ).toBe("join");
    expect(
        circleNextStep({
            ...base,
            pendingAbsence: false,
            assignments: [assignment("submitted")],
        }).label,
    ).toBe("awaiting");
});

test("absence prompt is scoped to own pending unexplained finalized non-cancelled attendance, not history pagination", () => {
    const query = source("features/groups/server/get-pending-absence.ts");
    for (const guard of [
        "eq(groupMeetingAttendance.userId, userId)",
        'eq(groupMeetingAttendance.status, "pending")',
        "isNotNull(groupMeetingSession.finalizedAt)",
        "isNull(groupMeetingSession.cancelledAt)",
        "nullif(trim(",
        "eq(groupMeeting.groupId, groupId)",
        "eq(groupMember.userId, userId)",
    ])
        expect(query).toContain(guard);
    expect(query).not.toContain("getMeetingHistory");
});
test("new members get reassurance rather than a dead-end button", () => {
    expect(circleNextStep(base)).toEqual({ label: "waiting", href: null });
});
test("member next step follows preparation, submission, revision and feedback", () => {
    for (const [status, label] of [
        ["in_progress", "prepare"],
        ["submitted", "awaiting"],
        ["needs_revision", "feedback"],
        ["not_completed", "feedback"],
        ["completed", "results"],
    ])
        expect(
            circleNextStep({ ...base, assignments: [assignment(status)] })
                .label,
        ).toBe(label);
    expect(
        circleNextStep({ ...base, assignments: [assignment("completed")] })
            .href,
    ).toBe("/groups/circle#your-feedback");
});
test("live meeting takes priority for both roles", () => {
    for (const supervisor of [false, true])
        expect(circleNextStep({ ...base, supervisor, live: true }).href).toBe(
            "/groups/circle/meeting",
        );
});

test("published assignments lead supervisors to the upcoming meeting", () => {
    const date = "2026-10-10T12:00:00Z";
    expect(
        circleNextStep({
            ...base,
            supervisor: true,
            nextStartsAt: date,
            assignments: [{ ...assignment("in_progress"), dueAt: date }],
        }).label,
    ).toBe("meetingReady");
    expect(
        circleNextStep({
            ...base,
            supervisor: true,
            nextStartsAt: date,
            assignments: [{ ...assignment("completed"), dueAt: date }],
        }).label,
    ).toBe("plan");
});
test("supervisors are guided from scheduling and invites to preparation and review", () => {
    const supervisor = { ...base, supervisor: true };
    expect(circleNextStep({ ...supervisor, scheduled: false }).label).toBe(
        "setup",
    );
    expect(circleNextStep({ ...supervisor, memberCount: 1 }).label).toBe(
        "invite",
    );
    expect(circleNextStep(supervisor).label).toBe("plan");
    expect(
        circleNextStep({
            ...supervisor,
            assignments: [assignment("submitted")],
        }).href,
    ).toBe("/groups/circle#meeting-overview");
});
test("waiting room distinguishes closure, access loss, network errors and admission", () => {
    expect(presenceState(200, { state: "active", hostPresent: false })).toBe(
        "waitingHost",
    );
    expect(presenceState(200, { state: "active", hostPresent: true })).toBe(
        "admitted",
    );
    expect(presenceState(200, { state: "closed", hostPresent: false })).toBe(
        "closed",
    );
    expect(presenceState(401)).toBe("signedOut");
    expect(presenceState(403)).toBe("noAccess");
    expect(presenceState(500)).toBe("connection");
    expect(presenceState(200, {})).toBe("connection");
});
test("readiness requires confirmation and membership, not recorded reading progress", () => {
    const action = source(
        "features/practice/server/submit-practice-assignment.ts",
    );
    expect(action).toContain("z.literal(true)");
    expect(action).toContain("groupMember.userId");
    expect(action).toContain("inArray(practiceAssignment.status");
    expect(action).not.toContain("reachedEnd");
    const progress = source(
        "features/practice/server/update-practice-progress.ts",
    );
    expect(progress).not.toContain('status: "in_progress"');
    expect(progress).not.toContain("submittedAt: null");
});
test("host handover checks both supervisor identities and current host under lock", () => {
    const action = source("features/groups/server/change-meeting-host.ts");
    for (const check of [
        "session.user.id",
        "hostUserId",
        "expectedHostUserId",
        "hostActiveUntil",
        '.for("update")',
    ])
        expect(action).toContain(check);
    expect(source("app/groups/[groupId]/meeting/page.tsx")).toContain(
        'canReview={group?.role === "supervisor"}',
    );
});
test("new flow labels exist in both languages", () => {
    const en = JSON.parse(source("messages/groups.en.json")).Groups.flow;
    const ar = JSON.parse(source("messages/groups.ar.json")).Groups.flow;
    expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(ar).every((value) => value.length > 0)).toBe(true);
});
