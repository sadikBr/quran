"use client";

import { BookMarked, LoaderCircle, RefreshCcw, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupMemberDetails } from "@/features/groups/types";
import QuranRangeSelector from "@/features/practice/components/quran-range-selector";
import type { PracticeKind, QuranReference } from "@/features/practice/types";
import { normalizeSearchText } from "@/features/quran/helpers/normalize-quran-search";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { cn } from "@/lib/utils";
import createMemberAssignment from "../server/create-member-assignment";

export interface AssignmentSurah {
    number: number;
    name: string;
    englishName: string;
    hafsAyahCount: number;
    warshAyahCount: number;
}

function defaultDueDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
}

export default function MemberAssignmentForm({
    groupId,
    members,
    surahs,
    navigationByRiwayah,
    locale,
}: {
    groupId: string;
    members: GroupMemberDetails[];
    surahs: AssignmentSurah[];
    navigationByRiwayah: Record<"hafs" | "warsh", QuranNavigationMeta>;
    locale: string;
}) {
    const t = useTranslations("Groups.assignments");
    const router = useRouter();
    const [assignee, setAssignee] = useState<GroupMemberDetails | null>(
        members[0] ?? null,
    );
    const [kind, setKind] = useState<PracticeKind>("memorization");
    const [start, setStart] = useState<QuranReference>({
        surahNumber: 1,
        ayahNumber: 1,
    });
    const [end, setEnd] = useState<QuranReference>({
        surahNumber: 1,
        ayahNumber: 7,
    });
    const [dueDate, setDueDate] = useState(defaultDueDate);
    const [instructions, setInstructions] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const surahOptions = useMemo(
        () =>
            surahs.map((surah) => ({
                number: surah.number,
                name: surah.name,
                englishName: surah.englishName,
                numberOfAyahs:
                    assignee?.riwayah === "warsh"
                        ? surah.warshAyahCount
                        : surah.hafsAyahCount,
            })),
        [assignee?.riwayah, surahs],
    );
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!assignee) return;
        setIsSaving(true);
        const result = await createMemberAssignment({
            groupId,
            assigneeId: assignee.userId,
            kind,
            start,
            end,
            dueDate,
            instructions,
        });
        setIsSaving(false);

        if (!result.success) {
            toast.error(t("error"));
            return;
        }

        toast.success(t("success"));
        setInstructions("");
        router.refresh();
    }

    return (
        <form onSubmit={submit} className="mt-6 space-y-7">
            <div>
                <Label>{t("member")}</Label>
                <Combobox
                    items={members}
                    value={assignee}
                    onValueChange={(member) => {
                        setAssignee(member);
                        setStart({ surahNumber: 1, ayahNumber: 1 });
                        setEnd({ surahNumber: 1, ayahNumber: 7 });
                    }}
                    itemToStringLabel={(member) => member.name}
                    itemToStringValue={(member) => member.userId}
                    isItemEqualToValue={(member, selected) =>
                        member.userId === selected.userId
                    }
                    filter={(member, query) =>
                        normalizeSearchText(
                            `${member.name} ${member.email}`,
                        ).includes(normalizeSearchText(query))
                    }
                    autoHighlight
                >
                    <ComboboxInput
                        aria-label={t("searchMember")}
                        placeholder={t("searchMember")}
                        className="mt-2 h-12 w-full rounded-xl border-0 bg-background/70 shadow-none ring-1 ring-border/60 focus-within:ring-primary/40"
                    />
                    <ComboboxContent
                        dir={locale === "ar" ? "rtl" : "ltr"}
                        className="w-[min(28rem,calc(100vw-2rem))] rounded-xl p-1"
                    >
                        <ComboboxEmpty>{t("noMembers")}</ComboboxEmpty>
                        <ComboboxList className="max-h-72 p-1">
                            {(member: GroupMemberDetails) => (
                                <ComboboxItem
                                    key={member.id}
                                    value={member}
                                    className="rounded-lg px-3 py-2.5 pe-9"
                                >
                                    <UserRound className="size-4 text-primary" />
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">
                                            {member.name}
                                        </span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {member.email}
                                        </span>
                                    </span>
                                </ComboboxItem>
                            )}
                        </ComboboxList>
                    </ComboboxContent>
                </Combobox>
            </div>

            <fieldset>
                <legend className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {t("kind")}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/55 p-1.5">
                    {(["memorization", "revision"] as const).map((option) => {
                        const Icon =
                            option === "memorization" ? BookMarked : RefreshCcw;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setKind(option)}
                                className={cn(
                                    "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                                    kind === option
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon className="size-4" />
                                {t(`kinds.${option}`)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <QuranRangeSelector
                surahs={surahOptions}
                navigation={navigationByRiwayah[assignee?.riwayah ?? "hafs"]}
                locale={locale}
                start={start}
                end={end}
                onChange={(range) => {
                    setStart(range.start);
                    setEnd(range.end);
                }}
            />

            <div className="grid gap-5 md:grid-cols-2">
                <div>
                    <Label htmlFor="assignment-due-date">{t("dueDate")}</Label>
                    <Input
                        id="assignment-due-date"
                        type="date"
                        required
                        value={dueDate}
                        onChange={(event) => setDueDate(event.target.value)}
                        className="mt-2 h-12 rounded-xl bg-background/70"
                    />
                </div>
                <div>
                    <Label htmlFor="assignment-instructions">
                        {t("instructions")}
                    </Label>
                    <Textarea
                        id="assignment-instructions"
                        value={instructions}
                        maxLength={500}
                        onChange={(event) =>
                            setInstructions(event.target.value)
                        }
                        placeholder={t("instructionsPlaceholder")}
                        className="mt-2 min-h-24 rounded-xl bg-background/70"
                    />
                </div>
            </div>

            <Button
                type="submit"
                disabled={isSaving || !assignee}
                className="h-11 w-full rounded-xl sm:w-auto"
            >
                {isSaving && <LoaderCircle className="size-4 animate-spin" />}
                {t(isSaving ? "submitting" : "submit")}
            </Button>
        </form>
    );
}
