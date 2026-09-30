import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const occurrence = new Date("2026-10-07T22:35:00Z");
const compiled = ts.transpileModule(
    readFileSync("src/features/groups/server/get-meeting-agenda.ts", "utf8"),
    {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            esModuleInterop: true,
        },
    },
).outputText;

async function agendaFor(rows) {
    const tables = Object.fromEntries(
        [
            "groupMember",
            "user",
            "practiceAssignment",
            "groupMeeting",
            "groupMeetingSession",
            "groupMeetingAttendance",
        ].map((name) => [name, new Proxy({}, { get: (_, key) => key })]),
    );
    let query = 0;
    const db = {
        select() {
            const index = query++;
            let predicate;
            const result = () =>
                [
                    [{ id: "membership" }],
                    [
                        {
                            userId: "member",
                            name: "Member",
                            image: null,
                            role: "member",
                        },
                    ],
                    rows.filter((row) => predicate?.(row)),
                    [],
                ][index];
            const chain = {
                from: () => chain,
                innerJoin: () => chain,
                where: (condition) => {
                    predicate = condition;
                    return chain;
                },
                orderBy: () => chain,
                limit: () => chain,
                // biome-ignore lint/suspicious/noThenProperty: Drizzle query builders are awaitable.
                then: (resolve) => resolve(result()),
            };
            return chain;
        },
    };
    const modules = {
        "server-only": {},
        "@/drizzle/db": db,
        "@/drizzle/schema": tables,
        "drizzle-orm": {
            and:
                (...predicates) =>
                (row) =>
                    predicates.every((p) => p(row)),
            or:
                (...predicates) =>
                (row) =>
                    predicates.some((p) => p(row)),
            eq: (key, value) => (row) =>
                +row[key] === +value || row[key] === value,
            lt: (key, value) => (row) => row[key] !== null && row[key] < value,
            isNull: (key) => (row) => row[key] === null,
            inArray: (key, values) => (row) => values.includes(row[key]),
            asc: (value) => value,
        },
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        require: (name) => modules[name],
        Date,
    });
    return exports.default({
        groupId: "circle",
        requestingUserId: "supervisor",
        occurrenceStartsAt: occurrence,
        active: false,
    });
}

const assignment = (id, status, dueAt) => ({
    id,
    status,
    dueAt,
    groupId: "circle",
    assigneeId: "member",
    kind: "memorization",
    reviewedForDueAt: null,
    startSurahNumber: 1,
    startAyahNumber: 1,
    endSurahNumber: 1,
    endAyahNumber: 7,
});

test("absent member's older submission stays ready in the next agenda", async () => {
    const result = await agendaFor([
        assignment("pending", "submitted", new Date("2026-09-30")),
    ]);
    expect(result.assignmentCount).toBe(1);
    expect(result.readyCount).toBe(1);
    expect(result.members[0].assignments[0].carriedForward).toBe(true);
    expect(result.members[0].attendance).toBe("not_started");
});

test("current and undated submissions remain visible, future and resolved older work do not", async () => {
    const result = await agendaFor(
        [
            assignment("current", "submitted", occurrence),
            assignment("undated", "submitted", null),
            assignment("future", "submitted", new Date("2026-10-14")),
            assignment("done", "completed", new Date("2026-09-30")),
            assignment("draft", "draft", occurrence),
            assignment("other-circle", "submitted", new Date("2026-09-30")),
        ].map((row) =>
            row.id === "other-circle" ? { ...row, groupId: "other" } : row,
        ),
    );
    expect(result.members[0].assignments.map((row) => row.id)).toEqual([
        "current",
        "undated",
    ]);
    expect(
        result.members[0].assignments.every((row) => !row.carriedForward),
    ).toBe(true);
});
