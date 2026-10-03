"use client";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { MistakeInput } from "../types";

export type ReferenceOption = {
    surahNumber: number;
    ayahNumber: number;
    label: string;
};
export const fieldClass =
    "mt-2 min-h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function MistakeEditor({
    references,
    onAdd,
    disabled = false,
}: {
    references: ReferenceOption[];
    onAdd: (value: MistakeInput) => Promise<boolean> | boolean;
    disabled?: boolean;
}) {
    const t = useTranslations("Memorization.retention");
    const id = useId();
    const [surah, setSurah] = useState(references[0]?.surahNumber ?? 1);
    const [ayah, setAyah] = useState(references[0]?.ayahNumber ?? 1);
    const [kind, setKind] = useState<MistakeInput["kind"]>("word");
    const [note, setNote] = useState("");
    const [pending, setPending] = useState(false);
    const surahs = [
        ...new Map(
            references.map((ref) => [ref.surahNumber, ref.label]),
        ).entries(),
    ];
    return (
        <fieldset
            disabled={disabled || pending || !references.length}
            className="min-w-0 space-y-4"
        >
            <legend className="mb-3 text-sm font-semibold">
                {t("addMistake")}
            </legend>
            <div className="grid grid-cols-2 gap-3">
                <label htmlFor={`${id}-surah`} className="min-w-0 text-sm">
                    {t("surah")}
                    <select
                        id={`${id}-surah`}
                        className={fieldClass}
                        value={surah}
                        onChange={(e) => {
                            const n = Number(e.target.value);
                            setSurah(n);
                            setAyah(
                                references.find((r) => r.surahNumber === n)
                                    ?.ayahNumber ?? 1,
                            );
                        }}
                    >
                        {surahs.map(([n, label]) => (
                            <option key={n} value={n}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label htmlFor={`${id}-ayah`} className="min-w-0 text-sm">
                    {t("ayah")}
                    <select
                        id={`${id}-ayah`}
                        className={fieldClass}
                        value={ayah}
                        onChange={(e) => setAyah(Number(e.target.value))}
                    >
                        {references
                            .filter((r) => r.surahNumber === surah)
                            .map((r) => (
                                <option key={r.ayahNumber} value={r.ayahNumber}>
                                    {r.ayahNumber}
                                </option>
                            ))}
                    </select>
                </label>
            </div>
            <label htmlFor={`${id}-kind`} className="block text-sm">
                {t("issue")}
                <select
                    id={`${id}-kind`}
                    className={fieldClass}
                    value={kind}
                    onChange={(e) =>
                        setKind(e.target.value as MistakeInput["kind"])
                    }
                >
                    {(["word", "continuation", "transition"] as const).map(
                        (k) => (
                            <option key={k} value={k}>
                                {t(`kinds.${k}`)}
                            </option>
                        ),
                    )}
                </select>
            </label>
            <label htmlFor={`${id}-note`} className="block text-sm">
                {t("note")}
                <Textarea
                    id={`${id}-note`}
                    value={note}
                    maxLength={1000}
                    onChange={(e) => setNote(e.target.value)}
                    dir="auto"
                    className="mt-2 rounded-xl"
                />
            </label>
            <Button
                type="button"
                className="min-h-11 w-full rounded-xl whitespace-normal"
                onClick={async () => {
                    if (pending) return;
                    setPending(true);
                    try {
                        if (
                            await onAdd({
                                surahNumber: surah,
                                ayahNumber: ayah,
                                kind,
                                note,
                            })
                        )
                            setNote("");
                    } finally {
                        setPending(false);
                    }
                }}
            >
                <Plus className="size-4" aria-hidden="true" />
                {t(pending ? "saving" : "addMistake")}
            </Button>
        </fieldset>
    );
}
