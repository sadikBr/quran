"use client";

import {
    BookMarked,
    CalendarClock,
    Check,
    ChevronDown,
    Copy,
    LoaderCircle,
    RefreshCcw,
    UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import QuranRangeSelector from "@/features/practice/components/quran-range-selector";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { cn } from "@/lib/utils";
import type {
    MeetingPlanAssignment,
    MeetingPlannerData,
} from "../meeting-plan-types";
import saveMeetingPlan from "../server/save-meeting-plan";
import type { GroupMemberDetails } from "../types";
import type {
    AssignmentMeetingOption,
    AssignmentSurah,
} from "./member-assignment-form";

interface EditableAssignment extends MeetingPlanAssignment {
    enabled: boolean;
}

function initials(name: string) {
    return (
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "U"
    );
}

function emptyAssignment(member: GroupMemberDetails): EditableAssignment {
    return {
        enabled: false,
        assigneeId: member.userId,
        kind: "memorization",
        riwayah: member.riwayah,
        start: { surahNumber: 1, ayahNumber: 1 },
        end: { surahNumber: 1, ayahNumber: 7 },
        instructions: "",
    };
}

export default function MeetingPlanEditor({
    groupId,
    members,
    surahs,
    planner,
    meetingOptions,
    navigationByRiwayah,
    locale,
    riwayah,
}: {
    groupId: string;
    members: GroupMemberDetails[];
    surahs: AssignmentSurah[];
    planner: MeetingPlannerData;
    meetingOptions: AssignmentMeetingOption[];
    navigationByRiwayah: Record<"hafs" | "warsh", QuranNavigationMeta>;
    locale: string;
    riwayah: "hafs" | "warsh";
}) {
    const t = useTranslations("Groups.planner");
    const assignmentsT = useTranslations("Groups.assignments");
    const practiceT = useTranslations("Practice");
    const router = useRouter();
    const initialMeetingStartsAt =
        meetingOptions.find((option) =>
            planner.drafts.some(
                (draft) =>
                    new Date(option.startsAt).getTime() ===
                    new Date(draft.dueMeetingStartsAt).getTime(),
            ),
        )?.startsAt ??
        meetingOptions[0]?.startsAt ??
        "";
    const entriesForMeeting = (startsAt: string) => {
        const draftByMember = new Map(
            planner.drafts
                .filter(
                    (draft) =>
                        new Date(draft.dueMeetingStartsAt).getTime() ===
                        new Date(startsAt).getTime(),
                )
                .map((draft) => [draft.assigneeId, draft]),
        );
        return members.map((member) => {
            const draft = draftByMember.get(member.userId);
            return draft
                ? { ...draft, enabled: true, riwayah: member.riwayah }
                : emptyAssignment(member);
        });
    };
    const [dueMeetingStartsAt, setDueMeetingStartsAt] = useState(
        initialMeetingStartsAt,
    );
    const [plansByMeeting, setPlansByMeeting] = useState<
        Record<string, EditableAssignment[]>
    >(() =>
        Object.fromEntries(
            meetingOptions.map((option) => [
                option.startsAt,
                entriesForMeeting(option.startsAt),
            ]),
        ),
    );
    const entries =
        plansByMeeting[dueMeetingStartsAt] ??
        entriesForMeeting(dueMeetingStartsAt);
    const [editingMemberId, setEditingMemberId] = useState<string | null>(
        entries.find((entry) => entry.enabled)?.assigneeId ?? null,
    );
    const [pendingMode, setPendingMode] = useState<"draft" | "publish" | null>(
        null,
    );
    const selectedCount = entries.filter((entry) => entry.enabled).length;
    const [copySource, setCopySource] = useState<EditableAssignment | null>(
        null,
    );
    const missingCount = members.length - selectedCount;
    const [bulkOpen, setBulkOpen] = useState(false);
    const initialBulk: EditableAssignment = {
        enabled: true,
        assigneeId: "",
        kind: "memorization",
        riwayah,
        start: { surahNumber: 1, ayahNumber: 1 },
        end: { surahNumber: 1, ayahNumber: 7 },
        instructions: "",
    };
    const [bulkPlans, setBulkPlans] = useState<
        Record<string, EditableAssignment>
    >({});
    const bulk = bulkPlans[dueMeetingStartsAt] ?? initialBulk;
    function updateBulk(update: Partial<EditableAssignment>) {
        setBulkPlans((current) => ({
            ...current,
            [dueMeetingStartsAt]: {
                ...(current[dueMeetingStartsAt] ?? initialBulk),
                ...update,
            },
        }));
    }

    function applyToAll() {
        if (!copySource || pendingMode) return;
        if (
            copySource.start.surahNumber > copySource.end.surahNumber ||
            (copySource.start.surahNumber === copySource.end.surahNumber &&
                copySource.start.ayahNumber > copySource.end.ayahNumber)
        ) {
            toast.error(t("applyAllInvalid"));
            setCopySource(null);
            return;
        }
        const valid = members.every((member) =>
            [copySource.start, copySource.end].every((point) => {
                const surah = surahs.find(
                    (item) => item.number === point.surahNumber,
                );
                const count =
                    member.riwayah === "warsh"
                        ? surah?.warshAyahCount
                        : surah?.hafsAyahCount;
                return (
                    count && point.ayahNumber >= 1 && point.ayahNumber <= count
                );
            }),
        );
        if (!valid) {
            toast.error(t("applyAllInvalid"));
            setCopySource(null);
            return;
        }
        setPlansByMeeting((current) => ({
            ...current,
            [dueMeetingStartsAt]: members.map((member) => ({
                ...emptyAssignment(member),
                enabled: true,
                kind: copySource.kind,
                start: { ...copySource.start },
                end: { ...copySource.end },
                instructions: copySource.instructions,
            })),
        }));
        setCopySource(null);
        toast.success(t("appliedAll"));
    }

    function updateEntry(
        assigneeId: string,
        update: (entry: EditableAssignment) => EditableAssignment,
    ) {
        setPlansByMeeting((current) => ({
            ...current,
            [dueMeetingStartsAt]: (
                current[dueMeetingStartsAt] ??
                entriesForMeeting(dueMeetingStartsAt)
            ).map((entry) =>
                entry.assigneeId === assigneeId ? update(entry) : entry,
            ),
        }));
    }

    function setEnabled(assigneeId: string, enabled: boolean) {
        updateEntry(assigneeId, (entry) => ({ ...entry, enabled }));
        setEditingMemberId(enabled ? assigneeId : null);
    }

    function copyPreviousWeek() {
        const previousByMember = new Map(
            planner.previousAssignments.map((assignment) => [
                assignment.assigneeId,
                assignment,
            ]),
        );
        setPlansByMeeting((current) => ({
            ...current,
            [dueMeetingStartsAt]: members.map((member) => {
                const previous = previousByMember.get(member.userId);
                return previous
                    ? {
                          ...previous,
                          enabled: true,
                          riwayah: member.riwayah,
                      }
                    : emptyAssignment(member);
            }),
        }));
        setEditingMemberId(null);
        toast.success(t("copied"));
    }

    async function save(mode: "draft" | "publish") {
        if (!dueMeetingStartsAt) {
            toast.error(t("noUpcomingMeetings"));
            return;
        }
        const selected = entries.filter((entry) => entry.enabled);
        if (selected.length === 0) {
            toast.error(t("selectOne"));
            return;
        }
        if (mode === "publish" && missingCount > 0) {
            toast.error(t("completeEveryMember"));
            return;
        }

        setPendingMode(mode);
        const result = await saveMeetingPlan({
            groupId,
            dueMeetingStartsAt,
            mode,
            entries: selected.map(
                ({ assigneeId, kind, start, end, instructions }) => ({
                    assigneeId,
                    kind,
                    start,
                    end,
                    instructions,
                }),
            ),
        });
        setPendingMode(null);

        if (!result.success) {
            toast.error(t("saveError"));
            return;
        }
        if (mode === "publish") {
            toast.success(t("published"));
            router.push(`/groups/${groupId}`);
            router.refresh();
            return;
        }

        toast.success(t("draftSaved"));
        router.refresh();
    }

    return (
        <div className="mt-8">
            <ConfirmationDialog
                open={copySource !== null}
                onOpenChange={(open) => {
                    if (!open) setCopySource(null);
                }}
                title={t("applyAll")}
                description={t("applyAllConfirm", { count: members.length })}
                confirmLabel={t("applyAll")}
                pending={pendingMode !== null}
                cancelLabel={t("cancelApplyAll")}
                onConfirm={applyToAll}
            />
            <section className="rounded-3xl bg-primary/[0.055] p-5 ring-1 ring-primary/12 sm:p-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="max-w-xl">
                        <Label htmlFor="meeting-plan-occurrence">
                            {t("meeting")}
                        </Label>
                        <Select
                            value={dueMeetingStartsAt}
                            onValueChange={(value) => {
                                setCopySource(null);
                                setDueMeetingStartsAt(value);
                                setEditingMemberId(
                                    (plansByMeeting[value] ?? []).find(
                                        (entry) => entry.enabled,
                                    )?.assigneeId ?? null,
                                );
                            }}
                            disabled={meetingOptions.length === 0}
                            required
                        >
                            <SelectTrigger
                                id="meeting-plan-occurrence"
                                className="mt-2 h-12 w-full bg-background/75 px-4"
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <CalendarClock className="size-4 shrink-0 text-primary" />
                                    <SelectValue
                                        placeholder={t("meetingPlaceholder")}
                                    />
                                </span>
                            </SelectTrigger>
                            <SelectContent
                                dir={locale === "ar" ? "rtl" : "ltr"}
                                position="popper"
                                className="max-h-72"
                            >
                                {meetingOptions.map((option) => (
                                    <SelectItem
                                        key={option.startsAt}
                                        value={option.startsAt}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {t(
                                meetingOptions.length > 0
                                    ? "meetingHint"
                                    : "noUpcomingMeetings",
                            )}
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={planner.previousAssignments.length === 0}
                        onClick={copyPreviousWeek}
                        className="h-11 rounded-xl"
                    >
                        <Copy className="size-4" />
                        {planner.previousMeetingStartsAt
                            ? t("copyPreviousDated", {
                                  date: new Intl.DateTimeFormat(locale, {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                  }).format(
                                      new Date(planner.previousMeetingStartsAt),
                                  ),
                              })
                            : t("copyPrevious")}
                    </Button>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                        {t("plannedCount", { count: selectedCount })}
                    </span>
                    <span
                        className={cn(
                            "rounded-full px-3 py-1 font-semibold",
                            missingCount > 0
                                ? "bg-destructive/8 text-destructive"
                                : "bg-primary/10 text-primary",
                        )}
                    >
                        {missingCount > 0
                            ? t("missingCount", { count: missingCount })
                            : t("everyoneReady")}
                    </span>
                </div>
                {members.length > 0 && (
                    <div className="mt-5 border-t border-primary/15 pt-5">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 w-full justify-between rounded-xl sm:w-auto sm:gap-8"
                            aria-expanded={bulkOpen}
                            aria-controls="shared-assignment-form"
                            onClick={() => setBulkOpen((open) => !open)}
                        >
                            <span className="flex items-center gap-2">
                                <Copy className="size-4" />
                                {t("sharedAssignment")}
                            </span>
                            <ChevronDown
                                className={cn(
                                    "size-4 transition-transform",
                                    bulkOpen && "rotate-180",
                                )}
                            />
                        </Button>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {t("sharedAssignmentHint")}
                        </p>
                        {bulkOpen && (
                            <div
                                id="shared-assignment-form"
                                className="mt-5 space-y-5 rounded-2xl border border-border/60 bg-background/50 p-4 sm:p-5"
                            >
                                <fieldset
                                    disabled={pendingMode !== null}
                                    className="space-y-5"
                                >
                                    <legend className="sr-only">
                                        {t("sharedAssignment")}
                                    </legend>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div>
                                            <Label>
                                                {assignmentsT("kind")}
                                            </Label>
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                {(
                                                    [
                                                        "memorization",
                                                        "revision",
                                                    ] as const
                                                ).map((kind) => (
                                                    <Button
                                                        key={kind}
                                                        type="button"
                                                        variant={
                                                            bulk.kind === kind
                                                                ? "default"
                                                                : "outline"
                                                        }
                                                        aria-pressed={
                                                            bulk.kind === kind
                                                        }
                                                        onClick={() =>
                                                            updateBulk({ kind })
                                                        }
                                                    >
                                                        {assignmentsT(
                                                            `kinds.${kind}`,
                                                        )}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <QuranRangeSelector
                                        surahs={surahs.map((surah) => ({
                                            ...surah,
                                            numberOfAyahs:
                                                bulk.riwayah === "warsh"
                                                    ? surah.warshAyahCount
                                                    : surah.hafsAyahCount,
                                        }))}
                                        navigation={
                                            navigationByRiwayah[bulk.riwayah]
                                        }
                                        locale={locale}
                                        start={bulk.start}
                                        end={bulk.end}
                                        onChange={updateBulk}
                                    />
                                    <div>
                                        <Label htmlFor="bulk-instructions">
                                            {assignmentsT("instructions")}
                                        </Label>
                                        <Textarea
                                            id="bulk-instructions"
                                            className="mt-2"
                                            maxLength={500}
                                            value={bulk.instructions}
                                            onChange={(event) =>
                                                updateBulk({
                                                    instructions:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        className="w-full sm:w-auto"
                                        disabled={
                                            !dueMeetingStartsAt ||
                                            pendingMode !== null
                                        }
                                        onClick={() => setCopySource(bulk)}
                                    >
                                        <Copy className="size-4" />
                                        {t("applyAll")}
                                    </Button>
                                </fieldset>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="mt-6 divide-y divide-border/55 overflow-hidden rounded-3xl bg-muted/30 ring-1 ring-border/50">
                {members.map((member) => {
                    const entry = entries.find(
                        (item) => item.assigneeId === member.userId,
                    );
                    if (!entry) return null;
                    const isEditing = editingMemberId === member.userId;
                    const surahOptions = surahs.map((surah) => ({
                        number: surah.number,
                        name: surah.name,
                        englishName: surah.englishName,
                        numberOfAyahs:
                            member.riwayah === "warsh"
                                ? surah.warshAyahCount
                                : surah.hafsAyahCount,
                    }));
                    const startSurah = surahOptions.find(
                        (surah) => surah.number === entry.start.surahNumber,
                    );
                    const endSurah = surahOptions.find(
                        (surah) => surah.number === entry.end.surahNumber,
                    );
                    const startName =
                        locale === "ar"
                            ? startSurah?.name
                            : startSurah?.englishName;
                    const endName =
                        locale === "ar"
                            ? endSurah?.name
                            : endSurah?.englishName;

                    return (
                        <article key={member.id} className="bg-background/20">
                            <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                                <Checkbox
                                    id={`plan-member-${member.id}`}
                                    checked={entry.enabled}
                                    onCheckedChange={(checked) =>
                                        setEnabled(
                                            member.userId,
                                            checked === true,
                                        )
                                    }
                                    aria-label={t("includeMember", {
                                        name: member.name,
                                    })}
                                />
                                <Avatar className="size-10 shrink-0 border border-primary/15">
                                    {member.image && (
                                        <AvatarImage
                                            src={member.image}
                                            alt=""
                                        />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                        {initials(member.name) || (
                                            <UserRound className="size-4" />
                                        )}
                                    </AvatarFallback>
                                </Avatar>
                                <label
                                    htmlFor={`plan-member-${member.id}`}
                                    className="min-w-0 flex-1 cursor-pointer"
                                >
                                    <span className="block truncate font-semibold">
                                        {member.name}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                        {entry.enabled
                                            ? practiceT("range", {
                                                  startSurah: startName ?? "",
                                                  startAyah:
                                                      entry.start.ayahNumber,
                                                  endSurah: endName ?? "",
                                                  endAyah: entry.end.ayahNumber,
                                              })
                                            : t("notPlanned")}
                                    </span>
                                </label>
                                <span className="hidden rounded-full bg-background/70 px-2.5 py-1 text-[0.7rem] text-muted-foreground ring-1 ring-border/50 sm:inline-flex">
                                    {assignmentsT(`riwayahs.${member.riwayah}`)}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    disabled={!entry.enabled}
                                    onClick={() =>
                                        setEditingMemberId(
                                            isEditing ? null : member.userId,
                                        )
                                    }
                                    className="rounded-xl"
                                >
                                    {t(isEditing ? "closeEditor" : "edit")}
                                    <ChevronDown
                                        className={cn(
                                            "size-4 transition-transform",
                                            isEditing && "rotate-180",
                                        )}
                                    />
                                </Button>
                            </div>

                            {entry.enabled && isEditing && (
                                <div className="border-t border-border/50 bg-background/35 px-4 py-5 sm:px-5 sm:py-6">
                                    <fieldset>
                                        <legend className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                            {assignmentsT("kind")}
                                        </legend>
                                        <div className="mt-3 grid max-w-lg grid-cols-2 gap-2 rounded-2xl bg-muted/55 p-1.5">
                                            {(
                                                [
                                                    "memorization",
                                                    "revision",
                                                ] as const
                                            ).map((kind) => {
                                                const Icon =
                                                    kind === "memorization"
                                                        ? BookMarked
                                                        : RefreshCcw;
                                                return (
                                                    <button
                                                        key={kind}
                                                        type="button"
                                                        onClick={() =>
                                                            updateEntry(
                                                                member.userId,
                                                                (current) => ({
                                                                    ...current,
                                                                    kind,
                                                                }),
                                                            )
                                                        }
                                                        className={cn(
                                                            "flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                                                            entry.kind === kind
                                                                ? "bg-background text-primary shadow-sm"
                                                                : "text-muted-foreground hover:text-foreground",
                                                        )}
                                                    >
                                                        <Icon className="size-4" />
                                                        {assignmentsT(
                                                            `kinds.${kind}`,
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </fieldset>

                                    <div className="mt-5">
                                        <QuranRangeSelector
                                            surahs={surahOptions}
                                            navigation={
                                                navigationByRiwayah[
                                                    member.riwayah
                                                ]
                                            }
                                            locale={locale}
                                            start={entry.start}
                                            end={entry.end}
                                            onChange={({ start, end }) =>
                                                updateEntry(
                                                    member.userId,
                                                    (current) => ({
                                                        ...current,
                                                        start,
                                                        end,
                                                    }),
                                                )
                                            }
                                        />
                                    </div>

                                    <div className="mt-5 max-w-2xl">
                                        <Label
                                            htmlFor={`plan-instructions-${member.id}`}
                                        >
                                            {assignmentsT("instructions")}
                                        </Label>
                                        <Textarea
                                            id={`plan-instructions-${member.id}`}
                                            value={entry.instructions}
                                            maxLength={500}
                                            onChange={(event) =>
                                                updateEntry(
                                                    member.userId,
                                                    (current) => ({
                                                        ...current,
                                                        instructions:
                                                            event.target.value,
                                                    }),
                                                )
                                            }
                                            placeholder={assignmentsT(
                                                "instructionsPlaceholder",
                                            )}
                                            className="mt-2 min-h-20 rounded-xl bg-background/70"
                                        />
                                    </div>
                                </div>
                            )}
                        </article>
                    );
                })}
            </section>

            <div className="mt-6 flex flex-col-reverse gap-3 rounded-3xl bg-background/70 p-4 ring-1 ring-border/50 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <p className="text-sm text-muted-foreground">
                    {missingCount > 0
                        ? t("publishHintMissing", { count: missingCount })
                        : t("publishHintReady")}
                </p>
                <div className="grid shrink-0 grid-cols-2 gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={
                            pendingMode !== null ||
                            selectedCount === 0 ||
                            !dueMeetingStartsAt
                        }
                        onClick={() => save("draft")}
                        className="rounded-xl"
                    >
                        {pendingMode === "draft" && (
                            <LoaderCircle className="size-4 animate-spin" />
                        )}
                        {t("saveDraft")}
                    </Button>
                    <Button
                        type="button"
                        disabled={
                            pendingMode !== null ||
                            missingCount > 0 ||
                            !dueMeetingStartsAt
                        }
                        onClick={() => save("publish")}
                        className="rounded-xl"
                    >
                        {pendingMode === "publish" ? (
                            <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                            <Check className="size-4" />
                        )}
                        {t("publish")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
