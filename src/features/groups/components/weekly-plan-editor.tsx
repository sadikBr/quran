"use client";

import {
    BookMarked,
    CalendarDays,
    Check,
    ChevronDown,
    Copy,
    LoaderCircle,
    RefreshCcw,
    UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import QuranRangeSelector from "@/features/practice/components/quran-range-selector";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { cn } from "@/lib/utils";
import saveWeeklyPlan from "../server/save-weekly-plan";
import type { GroupMemberDetails } from "../types";
import type {
    WeeklyPlanAssignment,
    WeeklyPlannerData,
} from "../weekly-planner-types";
import type { AssignmentSurah } from "./member-assignment-form";

interface EditableAssignment extends WeeklyPlanAssignment {
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

function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
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

export default function WeeklyPlanEditor({
    groupId,
    members,
    surahs,
    planner,
    navigationByRiwayah,
    locale,
}: {
    groupId: string;
    members: GroupMemberDetails[];
    surahs: AssignmentSurah[];
    planner: WeeklyPlannerData;
    navigationByRiwayah: Record<"hafs" | "warsh", QuranNavigationMeta>;
    locale: string;
}) {
    const t = useTranslations("Groups.planner");
    const assignmentsT = useTranslations("Groups.assignments");
    const practiceT = useTranslations("Practice");
    const router = useRouter();
    const draftByMember = useMemo(
        () => new Map(planner.drafts.map((draft) => [draft.assigneeId, draft])),
        [planner.drafts],
    );
    const [entries, setEntries] = useState<EditableAssignment[]>(() =>
        members.map((member) => {
            const draft = draftByMember.get(member.userId);
            return draft
                ? { ...draft, enabled: true, riwayah: member.riwayah }
                : emptyAssignment(member);
        }),
    );
    const [dueDate, setDueDate] = useState(planner.dueDate ?? defaultDueDate());
    const [editingMemberId, setEditingMemberId] = useState<string | null>(
        planner.drafts[0]?.assigneeId ?? null,
    );
    const [pendingMode, setPendingMode] = useState<"draft" | "publish" | null>(
        null,
    );
    const selectedCount = entries.filter((entry) => entry.enabled).length;
    const missingCount = members.length - selectedCount;

    function updateEntry(
        assigneeId: string,
        update: (entry: EditableAssignment) => EditableAssignment,
    ) {
        setEntries((current) =>
            current.map((entry) =>
                entry.assigneeId === assigneeId ? update(entry) : entry,
            ),
        );
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
        setEntries(
            members.map((member) => {
                const previous = previousByMember.get(member.userId);
                return previous
                    ? {
                          ...previous,
                          enabled: true,
                          riwayah: member.riwayah,
                      }
                    : emptyAssignment(member);
            }),
        );
        setEditingMemberId(null);
        toast.success(t("copied"));
    }

    async function save(mode: "draft" | "publish") {
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
        const result = await saveWeeklyPlan({
            groupId,
            dueDate,
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
            <section className="rounded-3xl bg-primary/[0.055] p-5 ring-1 ring-primary/12 sm:p-6">
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <div className="max-w-sm">
                        <Label htmlFor="weekly-plan-due-date">
                            {t("weekDeadline")}
                        </Label>
                        <div className="relative mt-2">
                            <CalendarDays className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="weekly-plan-due-date"
                                type="date"
                                required
                                value={dueDate}
                                onChange={(event) =>
                                    setDueDate(event.target.value)
                                }
                                className="h-12 rounded-xl bg-background/75 ps-10"
                            />
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={planner.previousAssignments.length === 0}
                        onClick={copyPreviousWeek}
                        className="h-11 rounded-xl"
                    >
                        <Copy className="size-4" />
                        {planner.previousDueDate
                            ? t("copyPreviousDated", {
                                  date: new Intl.DateTimeFormat(locale, {
                                      dateStyle: "medium",
                                      timeZone: "UTC",
                                  }).format(
                                      new Date(
                                          `${planner.previousDueDate}T12:00:00.000Z`,
                                      ),
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
                        disabled={pendingMode !== null || selectedCount === 0}
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
                        disabled={pendingMode !== null || missingCount > 0}
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
