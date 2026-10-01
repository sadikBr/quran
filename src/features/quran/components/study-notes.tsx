"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type StudyNote, studySourceUrl } from "../study-types";

function NoteText({ text }: { text: string }) {
    const t = useTranslations("Reader.study");
    const [expanded, setExpanded] = useState(false);
    const id = useId();
    const long = text.length > 800;
    return (
        <div>
            <p
                id={id}
                dir="rtl"
                lang="ar"
                className={cn(
                    "whitespace-pre-line font-(family-name:--font-tafsir) text-xl leading-10 [overflow-wrap:anywhere]",
                    long && !expanded && "line-clamp-6",
                )}
            >
                {text}
            </p>
            {long && (
                <Button
                    variant="ghost"
                    className="mt-2 text-primary"
                    aria-controls={id}
                    aria-expanded={expanded}
                    onClick={() => setExpanded((value) => !value)}
                >
                    {expanded ? t("collapseNote") : t("expandNote")}
                </Button>
            )}
        </div>
    );
}

export default function StudyNotes({
    notes,
    surahNumber,
}: {
    notes: StudyNote[];
    surahNumber: number;
}) {
    const t = useTranslations("Reader.study");
    const id = useId();
    const [category, setCategory] = useState("");
    const [visibleCount, setVisibleCount] = useState(8);
    const categories = [
        ...new Set(
            notes.flatMap((note) => (note.category ? [note.category] : [])),
        ),
    ];
    const filtered = notes.filter(
        (note) => !category || note.category === category,
    );
    return (
        <div className="space-y-4">
            {categories.length > 1 && (
                <div>
                    <label
                        htmlFor={id}
                        className="mb-2 block text-xs font-semibold text-muted-foreground"
                    >
                        {t("noteCategory")}
                    </label>
                    <select
                        id={id}
                        value={category}
                        onChange={(event) => {
                            setCategory(event.target.value);
                            setVisibleCount(8);
                        }}
                        className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"
                    >
                        <option value="">{t("allNotes")}</option>
                        {categories.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {filtered.slice(0, visibleCount).map((note) => (
                <article
                    key={JSON.stringify([
                        note.text,
                        note.attribution,
                        note.category,
                        note.hasAttachments,
                    ])}
                    className="app-card p-4 sm:p-5"
                >
                    {note.category && (
                        <p
                            dir="rtl"
                            lang="ar"
                            className="mb-3 text-xs font-medium text-primary"
                        >
                            {note.category}
                        </p>
                    )}
                    <NoteText text={note.text} />
                    <footer className="mt-4 space-y-2 border-t border-border/50 pt-3 text-xs leading-6 text-muted-foreground">
                        {note.attribution && (
                            <p dir="auto">
                                {t("noteAttribution", {
                                    name: note.attribution,
                                })}
                            </p>
                        )}
                        <p>
                            {t("reference", {
                                reference: note.references
                                    .map((ayah) => `${surahNumber}:${ayah}`)
                                    .join("، "),
                            })}
                        </p>
                        {note.hasAttachments && (
                            <a
                                href={studySourceUrl(
                                    surahNumber,
                                    note.references[0],
                                    "notes",
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                            >
                                {t("noteMedia")}
                            </a>
                        )}
                    </footer>
                </article>
            ))}
            {filtered.length > visibleCount && (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisibleCount((value) => value + 8)}
                >
                    {t("moreNotes")}
                </Button>
            )}
        </div>
    );
}
