"use client";

import { BookMarked, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { QuranNavigationMeta } from "@/features/quran/navigation-types";
import { cn } from "@/lib/utils";
import savePracticeAssignment from "../server/save-practice-assignment";
import type {
    PracticeAssignment,
    PracticeKind,
    QuranReference,
} from "../types";
import QuranRangeSelector, { type SurahOption } from "./quran-range-selector";

export default function PracticeRangeForm({
    surahs,
    navigation,
    assignments,
    locale,
    initialRange,
}: {
    surahs: SurahOption[];
    navigation: QuranNavigationMeta;
    assignments: PracticeAssignment[];
    locale: string;
    initialRange?: { start: QuranReference; end: QuranReference };
}) {
    const router = useRouter();
    const t = useTranslations("Practice.form");
    const initialAssignment =
        assignments.find((item) => item.kind === "memorization") ??
        assignments[0];
    const [kind, setKind] = useState<PracticeKind>(
        initialRange
            ? "memorization"
            : (initialAssignment?.kind ?? "memorization"),
    );
    const [start, setStart] = useState(
        initialRange?.start ??
            initialAssignment?.start ?? { surahNumber: 1, ayahNumber: 1 },
    );
    const [end, setEnd] = useState(
        initialRange?.end ??
            initialAssignment?.end ?? { surahNumber: 1, ayahNumber: 7 },
    );
    const [isSaving, setIsSaving] = useState(false);
    const activeAssignment = assignments.find((item) => item.kind === kind);

    function changeKind(nextKind: PracticeKind) {
        setKind(nextKind);
        const savedAssignment = assignments.find(
            (item) => item.kind === nextKind,
        );
        setStart(savedAssignment?.start ?? { surahNumber: 1, ayahNumber: 1 });
        setEnd(savedAssignment?.end ?? { surahNumber: 1, ayahNumber: 7 });
    }

    async function save() {
        setIsSaving(true);
        const result = await savePracticeAssignment({ kind, start, end });
        setIsSaving(false);

        if (!result.success) {
            toast.error(t("error"));
            return;
        }

        toast.success(t("success"));
        router.refresh();
    }

    return (
        <form
            className="mt-7 space-y-7"
            onSubmit={(event) => {
                event.preventDefault();
                save();
            }}
        >
            <fieldset>
                <legend className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                    {t("kindLabel")}
                </legend>
                <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-muted/55 p-1.5">
                    {(["memorization", "revision"] as const).map((option) => {
                        const Icon =
                            option === "memorization" ? BookMarked : RefreshCcw;
                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => changeKind(option)}
                                className={cn(
                                    "flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors",
                                    kind === option
                                        ? "bg-background text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <Icon aria-hidden="true" className="size-4" />
                                {t(`kinds.${option}`)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            <QuranRangeSelector
                surahs={surahs}
                navigation={navigation}
                locale={locale}
                start={start}
                end={end}
                onChange={(range) => {
                    setStart(range.start);
                    setEnd(range.end);
                }}
            />

            <div className="flex justify-end">
                <Button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-11 min-w-44 rounded-xl"
                >
                    {isSaving
                        ? t("saving")
                        : activeAssignment
                          ? t("update")
                          : t("create")}
                </Button>
            </div>
        </form>
    );
}
