import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import React from "react";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";
import { memorizationReaderAssignment } from "../src/features/learning/reader";
import { remainingReaderGroups } from "../src/features/learning/remaining-reader-groups";
import mapWarshAyahs, {
    getWarshAudioAyahNumbers,
    usesNativeWarshAyahNumbering,
} from "../src/features/quran/helpers/map-warsh-ayahs";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const item = {
    id: "weekly-session",
    done: false,
    startSurahNumber: 2,
    startAyahNumber: 141,
    endSurahNumber: 2,
    endAyahNumber: 156,
    quarters: [4],
    scheduledDate: "2026-10-03",
    ordinal: 0,
};
const preferences = {
    reciter: "test",
    arabicEdition: "arabic",
    showTranslation: false,
    riwayah: "hafs",
};
function readerLoader(warshCalls = []) {
    return loadTypeScript(
        "src/features/practice/server/get-practice-reader-data.ts",
        {
            "server-only": {},
            "@/features/quran/helpers/get-recitation-streams": () => [],
            "@/features/quran/helpers/map-warsh-ayahs": {
                __esModule: true,
                default: mapWarshAyahs,
                getWarshAudioAyahNumbers,
                usesNativeWarshAyahNumbering,
            },
            "@/features/quran/server/get-available-reciter": async () => ({
                reciters: [],
            }),
            "@/features/quran/server/get-surah": async (number) => ({
                surahMeta: {
                    number: Number(number),
                    name: "Surah",
                    englishName: "Surah",
                    numberOfAyahs: 160,
                },
                ayahs: Array.from({ length: 160 }, (_, i) => ({
                    number: i + 1,
                    numberInSurah: i + 1,
                    text: "ayah",
                })),
            }),
            "@/features/quran/server/get-warsh-chapter": async (number) => {
                warshCalls.push(number);
                return {
                    id: number,
                    verses: Array.from({ length: 160 }, (_, i) => ({
                        id: i + 1,
                        number: i + 1,
                        number_in_hafs: [i + 1],
                        text: "Warsh ayah",
                    })),
                };
            },
        },
    ).default;
}
function loadPage(
    modules,
    path = "src/app/practice/memorization/[sessionId]/read/page.tsx",
) {
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
        fileName: "page.tsx",
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true,
        },
    }).outputText;
    vm.runInNewContext(compiled, {
        exports,
        require(name) {
            if (name === "react/jsx-runtime") return jsx;
            if (!(name in modules))
                throw new Error(`Unexpected import: ${name}`);
            return modules[name];
        },
    });
    return exports.default;
}
test("weekly memorization reader loads the entire scheduled range, not the ayah actions route", async () => {
    const assignment = memorizationReaderAssignment(item, "hafs");
    const groups = await readerLoader()(assignment, preferences);
    expect(groups[0].ayahs.map((a) => a.numberInSurah)).toEqual(
        Array.from({ length: 16 }, (_, i) => i + 141),
    );
    expect(assignment.progress).toBeNull();
    expect(assignment.status).toBe("in_progress");
});
test("reader honors snapshot Warsh and inclusive endpoints across surahs", async () => {
    const calls = [];
    const assignment = memorizationReaderAssignment(
        { ...item, startAyahNumber: 158, endSurahNumber: 3, endAyahNumber: 2 },
        "warsh",
    );
    const groups = await readerLoader(calls)(assignment, preferences);
    expect(calls).toEqual([2, 3]);
    expect(groups.map((g) => g.ayahs.map((a) => a.numberInSurah))).toEqual([
        [158, 159, 160],
        [1, 2],
    ]);
});
test("reader page checks session ownership and plan state before loading the passage", async () => {
    let userId = "owner",
        admin = false,
        enabled = true,
        requested = "weekly-session",
        calls = 0;
    function Reader() {
        return null;
    }
    const page = loadPage({
        "next/headers": { headers: async () => new Headers() },
        "next/navigation": {
            redirect: (path) => {
                throw new Error(`redirect:${path}`);
            },
        },
        "@/components/app-logo": () => null,
        "@/components/app-primary-nav": () => null,
        "@/features/auth/auth": {
            auth: {
                api: {
                    getSession: async () =>
                        userId ? { user: { id: userId } } : null,
                },
            },
        },
        "@/features/auth/permissions": { isPlatformAdmin: async () => admin },
        "@/features/learning/remaining-reader-groups": {
            remainingReaderGroups,
        },
        "@/features/practice/components/practice-reader": Reader,
        "@/features/practice/components/practice-reader-shell": "ReaderShell",
        "@/features/learning/reader": { memorizationReaderAssignment },
        "@/features/learning/server/service": {
            getMemorizationPlanView: async (id) => ({
                plan: { enabled },
                week: { riwayah: "warsh" },
                sessions:
                    id === "owner"
                        ? [
                              {
                                  ...item,
                                  active: enabled,
                                  completed: 0,
                                  total: 16,
                              },
                          ]
                        : [],
            }),
        },
        "@/features/practice/server/get-practice-reader-data": async (
            assignment,
        ) => {
            calls++;
            expect(assignment.riwayah).toBe("warsh");
            expect(assignment.start.ayahNumber).toBe(141);
            expect(assignment.end.ayahNumber).toBe(156);
            return [];
        },
        "@/features/settings/server/get-preferences": async () => ({
            ...preferences,
            language: "en",
            continuousRecitation: false,
        }),
        "@/i18n/config": { getTextDirection: () => "ltr" },
        "@/lib/utils": { cn: (...values) => values.filter(Boolean).join(" ") },
    });
    const run = () =>
        page({ params: Promise.resolve({ sessionId: requested }) });
    const tree = await run();
    const reader = React.Children.toArray(tree.props.children).find(
        (child) => child.type === Reader,
    );
    expect(reader.props.assignment.riwayah).toBe("warsh");
    expect(reader.props.assignment.status).toBe("in_progress");
    expect(calls).toBe(1);
    userId = "other";
    await expect(run()).rejects.toThrow("redirect:/practice");
    userId = "owner";
    requested = "missing";
    await expect(run()).rejects.toThrow("redirect:/practice");
    requested = "weekly-session";
    enabled = false;
    await expect(run()).rejects.toThrow("redirect:/practice");
    enabled = true;
    admin = true;
    await expect(run()).rejects.toThrow("redirect:/admin");
    admin = false;
    userId = null;
    await expect(run()).rejects.toThrow("redirect:/sign-in");
    expect(calls).toBe(1);
});

function mountReader(
    assignment,
    response = { success: true, completed: true },
) {
    let stateIndex = 0,
        refIndex = 0;
    const states = [],
        refs = [],
        calls = [];
    const action = (name) => async (input) => {
        calls.push({ name, input });
        return response;
    };
    const Reader = loadPage(
        {
            react: {
                useState(initial) {
                    const index = stateIndex++;
                    if (!(index in states))
                        states[index] =
                            typeof initial === "function" ? initial() : initial;
                    return [
                        states[index],
                        (value) => {
                            states[index] =
                                typeof value === "function"
                                    ? value(states[index])
                                    : value;
                        },
                    ];
                },
                useRef(initial) {
                    const index = refIndex++;
                    refs[index] ??= { current: initial };
                    return refs[index];
                },
                useMemo: (calculate) => calculate(),
                useEffect() {},
            },
            "lucide-react": Object.fromEntries(
                [
                    "Check",
                    "CheckCircle2",
                    "Eye",
                    "EyeOff",
                    "LoaderCircle",
                    "MapPin",
                ].map((name) => [name, name]),
            ),
            "next/link": "Link",
            "next/navigation": {
                useRouter: () => ({
                    replace: (path) =>
                        calls.push({ name: "redirect", input: path }),
                    refresh() {},
                }),
            },
            "next-intl": {
                useLocale: () => "en",
                useTranslations: () => (key) => key,
            },
            sonner: { toast: { success() {}, error() {} } },
            "@/components/ui/button": { Button: "Button" },
            "@/components/ui/confirmation-dialog": "Confirmation",
            "@/features/groups/components/review-method-label": "ReviewMethod",
            "@/features/learning/server/actions": {
                completeWeeklyMemorization: action("weekly-memory"),
                saveWeeklyMemorizationProgress: action("memorization-progress"),
            },
            "@/features/memorization/server/record-actions": {
                confirmPersonalMemorization: action("personal-memory"),
            },
            "@/features/quran/components/ayah": "Ayah",
            "@/features/quran/components/guided-reader": {
                __esModule: true,
                default: "GuidedReader",
                GuidedReaderSurah: "Surah",
                GuidedReaderVerse: "Verse",
            },
            "@/features/quran/helpers/get-ayah-audio-streams": () => [],
            "@/features/revision/server/actions": {
                finishWeeklyRevision: action("finish-revision"),
                saveWeeklyRevisionProgress: action("revision-progress"),
            },
            "@/lib/utils": {
                cn: (...values) => values.filter(Boolean).join(" "),
            },
            "../preparation-progress": {
                preparedAyahs: (status, total, read) =>
                    status === "completed" ? total : read,
            },
            "../server/submit-practice-assignment": action("submit"),
            "../server/update-practice-progress": action("practice-progress"),
            "../types": {
                referenceOrder: (r) => r.surahNumber * 1000 + r.ayahNumber,
            },
        },
        "src/features/practice/components/practice-reader.tsx",
    );
    function render() {
        stateIndex = 0;
        refIndex = 0;
        const tree = Reader({
            assignment,
            groups: [
                {
                    surah: {
                        number: 2,
                        name: "البقرة",
                        englishName: "Al-Baqarah",
                        numberOfAyahs: 286,
                    },
                    ayahs: [
                        { number: 141, numberInSurah: 141 },
                        { number: 156, numberInSurah: 156 },
                    ],
                    translatedAyahs: [],
                },
            ],
            showTranslation: false,
            continuousRecitation: false,
        });
        function flatten(node) {
            if (!node || typeof node !== "object") return [];
            const children = [node.props?.children].flat(Infinity);
            return [node, ...children.flatMap(flatten)];
        }
        return flatten(tree);
    }
    return { render, calls };
}
test("existing memorization reader credits weekly memorization only after confirmation", async () => {
    const harness = mountReader(memorizationReaderAssignment(item, "hafs"));
    let nodes = harness.render();
    const reached = nodes
        .filter(
            (n) =>
                n.type === "Button" &&
                n.props.children?.includes?.("markReached"),
        )
        .at(-1);
    await reached.props.onClick();
    expect(harness.calls.map((call) => call.name)).toEqual([
        "memorization-progress",
    ]);
    nodes = harness.render();
    const confirmButton = nodes.find(
        (n) => n.type === "Button" && n.props.children === "confirm",
    );
    expect(confirmButton.props.disabled).toBe(false);
    confirmButton.props.onClick();
    nodes = harness.render();
    const dialog = nodes.find((n) => n.type === "Confirmation" && n.props.open);
    await dialog.props.onConfirm();
    expect(harness.calls).toEqual([
        {
            name: "memorization-progress",
            input: { assignmentId: item.id, surahNumber: 2, ayahNumber: 156 },
        },
        {
            name: "weekly-memory",
            input: { sessionId: item.id, confirmed: true },
        },
    ]);
});
test("existing revision and personal readers still save to their respective progress actions", async () => {
    for (const [source, kind, expected] of [
        ["weekly", "revision", "revision-progress"],
        ["weekly", "memorization", "memorization-progress"],
        ["personal", "memorization", "practice-progress"],
    ]) {
        const harness = mountReader({
            ...memorizationReaderAssignment(item, "hafs"),
            source,
            kind,
        });
        const nodes = harness.render();
        const button = nodes
            .filter(
                (n) =>
                    n.type === "Button" &&
                    n.props.children?.includes?.("markReached"),
            )
            .at(-1);
        await button.props.onClick();
        expect(harness.calls).toEqual([
            {
                name: expected,
                input: {
                    assignmentId: item.id,
                    surahNumber: 2,
                    ayahNumber: 156,
                },
            },
        ]);
    }
});

for (const kind of ["revision", "memorization"]) {
    test(`${kind} plan opens the shared reader and shell with covered gaps and saved progress`, async () => {
        const row = {
            ...item,
            available: true,
            riwayah: "warsh",
            peer: 1,
            completed: 1,
            remaining: ["2:141", "2:156"],
            progressSurahNumber: 2,
            progressAyahNumber: 141,
            completedAt: null,
            outcome: null,
        };
        let active = true,
            authorized = true,
            loadCalls = 0;
        function Reader() {
            return null;
        }
        const page = loadPage(
            {
                "next/headers": { headers: async () => new Headers() },
                "next/navigation": {
                    redirect: (path) => {
                        throw new Error(`redirect:${path}`);
                    },
                },
                "@/features/auth/auth": {
                    auth: {
                        api: {
                            getSession: async () => ({ user: { id: "owner" } }),
                        },
                    },
                },
                "@/features/auth/permissions": {
                    isPlatformAdmin: async () => false,
                },
                "@/features/learning/remaining-reader-groups": {
                    remainingReaderGroups,
                },
                "@/features/practice/components/practice-reader": Reader,
                "@/features/practice/components/practice-reader-shell":
                    "ReaderShell",
                "@/features/practice/server/get-practice-reader-data": async (
                    assignment,
                ) => {
                    loadCalls++;
                    expect(assignment.start).toEqual({
                        surahNumber: 2,
                        ayahNumber: 141,
                    });
                    expect(assignment.end).toEqual({
                        surahNumber: 2,
                        ayahNumber: 156,
                    });
                    return [
                        {
                            surah: { number: 2 },
                            ayahs: [
                                { numberInSurah: 141 },
                                { numberInSurah: 142 },
                                { numberInSurah: 156 },
                            ],
                        },
                    ];
                },
                "@/features/learning/reader": { memorizationReaderAssignment },
                "@/features/learning/server/service": {
                    getMemorizationPlanView: async () => ({
                        plan: { enabled: true },
                        week: { riwayah: "warsh" },
                        sessions: authorized ? [{ ...row, active }] : [],
                    }),
                },
                "@/features/revision/server/service": {
                    getRevisionView: async () => ({
                        plan: { enabled: true },
                        sessions: authorized ? [{ ...row, active }] : [],
                    }),
                },
                "@/features/settings/server/get-preferences": async () => ({
                    language: "ar",
                    riwayah: "hafs",
                    showTranslation: true,
                    continuousRecitation: true,
                }),
            },
            `src/app/practice/${kind}/[sessionId]/read/page.tsx`,
        );
        const run = () =>
            page({ params: Promise.resolve({ sessionId: item.id }) });
        const tree = await run();
        expect(tree.type).toBe("ReaderShell");
        expect(tree.props.language).toBe("ar");
        const reader = tree.props.children;
        expect(reader.type).toBe(Reader);
        expect(reader.props.assignment.kind).toBe(kind);
        expect(reader.props.assignment.riwayah).toBe("warsh");
        expect(reader.props.assignment.progress).toEqual({
            surahNumber: 2,
            ayahNumber: 141,
        });
        expect(
            reader.props.groups[0].ayahs.map((a) => a.numberInSurah),
        ).toEqual([141, 156]);
        expect(reader.props.showTranslation).toBe(true);
        expect(reader.props.continuousRecitation).toBe(true);
        active = false;
        await expect(run()).rejects.toThrow("redirect:/practice");
        active = true;
        authorized = false;
        await expect(run()).rejects.toThrow("redirect:/practice");
        expect(loadCalls).toBe(1);
    });
}

test("automatically covered weekly passages are not labeled as self-confirmed", () => {
    const assignment = memorizationReaderAssignment(
        { ...item, done: true },
        "hafs",
    );
    const harness = mountReader(assignment);
    const label = harness.render().find((node) => node.type === "ReviewMethod");
    expect(label.props.method).toBeNull();
});

test("the reader preserves a saved weekly self-confirmation", () => {
    const assignment = memorizationReaderAssignment(
        {
            ...item,
            done: true,
            completedAt: "2026-10-02T12:00:00Z",
        },
        "hafs",
    );
    expect(assignment.reviewMethod).toBe("self");
});

test("memorization restores saved progress and both readers stop at the last uncovered ayah", () => {
    const assignment = memorizationReaderAssignment(
        {
            ...item,
            progressSurahNumber: 2,
            progressAyahNumber: 142,
        },
        "warsh",
    );
    expect(assignment.progress).toEqual({ surahNumber: 2, ayahNumber: 142 });
    const groups = remainingReaderGroups(
        assignment,
        [
            {
                surah: { number: 2 },
                ayahs: [
                    { numberInSurah: 141 },
                    { numberInSurah: 142 },
                    { numberInSurah: 156 },
                ],
            },
            { surah: { number: 3 }, ayahs: [{ numberInSurah: 1 }] },
        ],
        ["2:141", "2:142"],
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].ayahs.map((ayah) => ayah.numberInSurah)).toEqual([
        141, 142,
    ]);
    expect(assignment.end).toEqual({ surahNumber: 2, ayahNumber: 142 });
});

test("both weekly readers link ayah actions to the saved reading and offer the matching return route", () => {
    for (const kind of ["memorization", "revision"]) {
        const nodes = mountReader({
            ...memorizationReaderAssignment(item, "warsh"),
            kind,
        }).render();
        expect(
            nodes
                .filter((n) => n.type === "Ayah")
                .map((n) => n.props.actionsHref),
        ).toEqual([
            "/quran/ayah/2/141?riwayah=warsh",
            "/quran/ayah/2/156?riwayah=warsh",
        ]);
        expect(
            nodes.some(
                (n) => n.type === "Link" && n.props.href === "/practice",
            ),
        ).toBe(true);
    }
});

for (const kind of ["memorization", "revision"]) {
    test(`${kind}: an expired reader returns to Practice without saving progress`, async () => {
        const harness = mountReader(
            { ...memorizationReaderAssignment(item, "hafs"), kind },
            { success: false, reason: "inactive" },
        );
        const button = harness
            .render()
            .filter(
                (n) =>
                    n.type === "Button" &&
                    n.props.children?.includes?.("markReached"),
            )
            .at(-1);
        await button.props.onClick();
        expect(harness.calls.at(-1)).toEqual({
            name: "redirect",
            input: "/practice",
        });
    });
}
