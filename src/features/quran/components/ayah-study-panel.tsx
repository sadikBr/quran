"use client";

import { ExternalLink, LoaderCircle, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import getAyahStudy from "../server/get-ayah-study";
import {
    type AyahStudyData,
    type SimilarGroup,
    type StudySection,
    studySourceUrl,
} from "../study-types";
import EditionCombobox from "./edition-combobox";
import StudyNotes from "./study-notes";
import StudyVerseList from "./study-verse-list";

export default function AyahStudyPanel({
    section,
    surahNumber,
    ayahNumber,
    riwayah,
    references,
    preferredBookId,
}: {
    section: StudySection;
    surahNumber: number;
    ayahNumber: number;
    riwayah: "hafs" | "warsh";
    references: number[];
    preferredBookId?: number;
}) {
    const t = useTranslations("Reader.study");
    const chooserId = useId();
    const [bookId, setBookId] = useState<number>();
    const [language, setLanguage] = useState<string>();
    const [topicId, setTopicId] = useState<number>();
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{
        key: string;
        data?: AyahStudyData;
        error?: boolean;
    }>();
    const [lastData, setLastData] = useState<AyahStudyData>();
    const [translationIds, setTranslationIds] = useState<number[] | null>(null);
    const [similarGroup, setSimilarGroup] = useState<SimilarGroup>();
    const key = JSON.stringify([
        section,
        surahNumber,
        ayahNumber,
        riwayah,
        bookId,
        language,
        topicId,
        preferredBookId,
        attempt,
    ]);

    useEffect(() => {
        let active = true;
        getAyahStudy({
            section,
            surahNumber,
            ayahNumber,
            riwayah,
            bookId,
            language,
            topicId,
            preferredBookId,
        }).then(
            (data) => {
                if (!active) return;
                setResult({ key, data });
                setLastData(data);
            },
            () => {
                if (active) setResult({ key, error: true });
            },
        );
        return () => {
            active = false;
        };
    }, [
        key,
        section,
        surahNumber,
        ayahNumber,
        riwayah,
        bookId,
        language,
        topicId,
        preferredBookId,
    ]);

    const busy = result?.key !== key;
    const data = result?.key === key ? result.data : undefined;
    const failed = result?.key === key && result.error;
    const choices = data ?? lastData;
    const books = choices && "books" in choices ? choices.books : [];
    const chosenBook =
        choices && "selectedBook" in choices ? choices.selectedBook : undefined;
    const sourceUrl =
        data?.sourceUrl ??
        studySourceUrl(surahNumber, references[0], section, bookId);
    const selectedTranslations =
        data?.section === "translations"
            ? (translationIds ??
              (() => {
                  const preferred = [13638, 13661].filter((id) =>
                      data.translations.some((item) => item.id === id),
                  );
                  return preferred.length
                      ? preferred
                      : data.translations.slice(0, 2).map((item) => item.id);
              })())
            : [];
    const activeGroup =
        data?.section === "similar"
            ? (data.groups.find((item) => item.type === similarGroup) ??
              data.groups[0])
            : undefined;
    const empty =
        data &&
        (("passages" in data && !data.passages.length) ||
            (data.section === "meanings" && !data.meanings.length) ||
            (data.section === "translations" && !data.translations.length) ||
            (data.section === "similar" && !data.groups.length) ||
            (data.section === "topics" && !data.topics.length) ||
            (data.section === "notes" && !data.notes.length));

    return (
        <div className="min-w-0 space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
                {t(`${section}Description`)}
            </p>
            {riwayah === "warsh" && (
                <p className="rounded-xl bg-muted/40 px-4 py-3 text-xs leading-6 text-muted-foreground">
                    {t("mappedReferences", {
                        references: references
                            .map((number) => `${surahNumber}:${number}`)
                            .join("، "),
                    })}
                </p>
            )}

            {books.length > 0 && (
                <div className="sticky top-0 z-10 space-y-2 border-b border-border/60 bg-background py-3">
                    <label
                        htmlFor={chooserId}
                        className="block text-xs font-semibold text-muted-foreground"
                    >
                        {t("chooseBook")}
                    </label>
                    <EditionCombobox
                        id={chooserId}
                        ariaLabel={t("chooseBook")}
                        editions={books.map((book) => ({
                            identifier: String(book.id),
                            name: book.author
                                ? `${book.name} — ${book.author}`
                                : book.name,
                            englishName: book.author
                                ? `${book.name} — ${book.author}`
                                : book.name,
                            language: "ar",
                            direction: "rtl",
                            format: "text",
                            type: section,
                        }))}
                        value={String(bookId ?? chosenBook?.id ?? "")}
                        onValueChange={(value) => setBookId(Number(value))}
                        disabled={busy}
                        placeholder={t("searchBooks")}
                        emptyMessage={t("noBooks")}
                        className="h-11 w-full rounded-xl bg-card"
                    />
                    {data && chosenBook?.author && (
                        <p
                            dir="auto"
                            className="text-xs leading-6 text-muted-foreground"
                        >
                            {chosenBook.author}
                        </p>
                    )}
                </div>
            )}

            {choices?.section === "topics" && choices.topics.length > 0 && (
                <div className="space-y-2">
                    <label
                        htmlFor={chooserId}
                        className="block text-xs font-semibold text-muted-foreground"
                    >
                        {t("chooseTopic")}
                    </label>
                    <EditionCombobox
                        id={chooserId}
                        ariaLabel={t("chooseTopic")}
                        editions={choices.topics.map((topic) => ({
                            identifier: String(topic.id),
                            name: [...topic.path, topic.name].join(" / "),
                            englishName: [...topic.path, topic.name].join(
                                " / ",
                            ),
                            language: "ar",
                            direction: "rtl",
                            format: "text",
                            type: "topics",
                        }))}
                        value={String(topicId ?? choices.topicId ?? "")}
                        onValueChange={(value) => setTopicId(Number(value))}
                        disabled={busy}
                        placeholder={t("searchTopics")}
                        emptyMessage={t("noTopics")}
                        className="h-11 w-full rounded-xl bg-card"
                    />
                </div>
            )}

            {choices?.section === "translations" &&
                choices.languages.length > 0 && (
                    <div className="space-y-2">
                        <label
                            htmlFor={chooserId}
                            className="block text-xs font-semibold text-muted-foreground"
                        >
                            {t("language")}
                        </label>
                        <select
                            id={chooserId}
                            value={language ?? choices.language}
                            disabled={busy}
                            onChange={(event) => {
                                setLanguage(event.target.value);
                                setTranslationIds(null);
                            }}
                            className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {choices.languages.map((item) => (
                                <option key={item.code} value={item.code}>
                                    {item.localName} — {item.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

            <div aria-busy={busy} className="min-w-0">
                {busy && (
                    <output className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircle
                            aria-hidden="true"
                            className="size-4 animate-spin"
                        />
                        {t("loading")}
                    </output>
                )}
                {failed && (
                    <div
                        role="alert"
                        className="rounded-xl border border-border p-5 text-center"
                    >
                        <p className="text-sm leading-6">{t("loadFailed")}</p>
                        <Button
                            variant="outline"
                            className="mt-3"
                            onClick={() => setAttempt((value) => value + 1)}
                        >
                            <RotateCcw aria-hidden="true" />
                            {t("retry")}
                        </Button>
                    </div>
                )}
                {empty && (
                    <p className="rounded-xl bg-muted/40 p-5 text-sm leading-6 text-muted-foreground">
                        {t("empty")}
                    </p>
                )}

                {data && "passages" in data && (
                    <div className="space-y-4">
                        {data.passages.map((passage, index) => (
                            <article
                                key={`${passage.references.join("-")}-${index}`}
                                className="app-card p-4 sm:p-5"
                            >
                                <p
                                    dir="rtl"
                                    lang="ar"
                                    className="whitespace-pre-line text-start font-(family-name:--font-tafsir) text-xl leading-[2] [overflow-wrap:anywhere]"
                                >
                                    {passage.text}
                                </p>
                                <footer className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/50 pt-3 text-xs text-muted-foreground">
                                    <span>
                                        {t("reference", {
                                            reference: passage.references
                                                .map(
                                                    (number) =>
                                                        `${surahNumber}:${number}`,
                                                )
                                                .join("، "),
                                        })}
                                    </span>
                                    {passage.part && (
                                        <span>
                                            {t("part", {
                                                number: passage.part,
                                            })}
                                        </span>
                                    )}
                                    {passage.page && (
                                        <span>
                                            {t("page", {
                                                number: passage.page,
                                            })}
                                        </span>
                                    )}
                                </footer>
                            </article>
                        ))}
                    </div>
                )}

                {data?.section === "meanings" && data.meanings.length > 0 && (
                    <dl
                        dir="rtl"
                        lang="ar"
                        className="app-card divide-y divide-border/60 overflow-hidden"
                    >
                        {data.meanings.map((entry) => (
                            <div
                                key={`${entry.word}-${entry.meaning}`}
                                className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-5"
                            >
                                <dt className="font-(family-name:--font-tafsir) text-xl font-bold leading-9 text-primary">
                                    {entry.word}
                                </dt>
                                <dd className="font-(family-name:--font-tafsir) text-xl leading-9 [overflow-wrap:anywhere]">
                                    {entry.meaning}
                                    {references.length > 1 && (
                                        <span className="mt-1 block font-sans text-xs text-muted-foreground">
                                            {entry.references
                                                .map(
                                                    (number) =>
                                                        `${surahNumber}:${number}`,
                                                )
                                                .join("، ")}
                                        </span>
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                )}

                {data?.section === "translations" &&
                    data.translations.length > 0 && (
                        <div className="space-y-4">
                            <details className="rounded-xl border border-border bg-muted/20 p-4">
                                <summary className="cursor-pointer text-sm font-medium">
                                    {t("chooseTranslations", {
                                        count: selectedTranslations.length,
                                    })}
                                </summary>
                                <fieldset className="mt-3 max-h-64 overflow-y-auto">
                                    <legend className="mb-2 text-xs text-muted-foreground">
                                        {t("compareLimit")}
                                    </legend>
                                    {data.translations.map((item) => (
                                        <label
                                            key={item.id}
                                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedTranslations.includes(
                                                    item.id,
                                                )}
                                                disabled={
                                                    !selectedTranslations.includes(
                                                        item.id,
                                                    ) &&
                                                    selectedTranslations.length >=
                                                        3
                                                }
                                                onChange={(event) =>
                                                    setTranslationIds(
                                                        event.target.checked
                                                            ? [
                                                                  ...selectedTranslations,
                                                                  item.id,
                                                              ]
                                                            : selectedTranslations.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      item.id,
                                                              ),
                                                    )
                                                }
                                                className="size-4 shrink-0 accent-primary"
                                            />
                                            <span dir="auto">{item.name}</span>
                                        </label>
                                    ))}
                                </fieldset>
                            </details>
                            {selectedTranslations.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                    {t("selectTranslation")}
                                </p>
                            )}
                            {data.translations
                                .filter((item) =>
                                    selectedTranslations.includes(item.id),
                                )
                                .map((item) => (
                                    <article
                                        key={item.id}
                                        className="app-card p-4 sm:p-5"
                                    >
                                        <h2
                                            dir="auto"
                                            className="mb-1 text-sm font-semibold text-primary"
                                        >
                                            {item.name}
                                        </h2>
                                        {item.author && (
                                            <p
                                                dir="auto"
                                                className="text-xs text-muted-foreground"
                                            >
                                                {item.author}
                                            </p>
                                        )}
                                        {item.passages.map((passage) => (
                                            <div
                                                key={passage.references.join(
                                                    "-",
                                                )}
                                                className="mt-3"
                                            >
                                                {references.length > 1 && (
                                                    <p className="mb-2 text-xs text-muted-foreground">
                                                        {t("reference", {
                                                            reference: `${surahNumber}:${passage.references[0]}`,
                                                        })}
                                                    </p>
                                                )}
                                                <p
                                                    lang={data.language}
                                                    dir={
                                                        data.languages.find(
                                                            (entry) =>
                                                                entry.code ===
                                                                data.language,
                                                        )?.direction ?? "auto"
                                                    }
                                                    className="whitespace-pre-line text-start font-serif text-base leading-8 [overflow-wrap:anywhere]"
                                                >
                                                    {passage.text}
                                                </p>
                                            </div>
                                        ))}
                                        {item.passages.length <
                                            references.length && (
                                            <p className="mt-3 text-xs text-muted-foreground">
                                                {t("partialTranslation")}
                                            </p>
                                        )}
                                    </article>
                                ))}
                        </div>
                    )}

                {data?.section === "topics" && data.topics.length > 0 && (
                    <div className="space-y-4">
                        <p className="text-xs leading-6 text-muted-foreground">
                            {t("relatedHafs")}
                        </p>
                        <p className="text-sm font-medium">
                            {t("relatedCount", { count: data.verses.length })}
                        </p>
                        {data.verses.length > 0 ? (
                            <StudyVerseList
                                key={data.topicId}
                                verses={data.verses}
                            />
                        ) : (
                            <p className="rounded-xl bg-muted/40 p-5 text-sm text-muted-foreground">
                                {t("noRelatedVerses")}
                            </p>
                        )}
                    </div>
                )}
                {data?.section === "notes" && data.notes.length > 0 && (
                    <StudyNotes notes={data.notes} surahNumber={surahNumber} />
                )}

                {data?.section === "similar" && activeGroup && (
                    <div className="space-y-4">
                        <p className="text-xs leading-6 text-muted-foreground">
                            {t("similarHafs")}
                        </p>
                        <fieldset
                            className="flex flex-wrap gap-2"
                            aria-label={t("similarGroups")}
                        >
                            {data.groups.map((group) => (
                                <button
                                    key={group.type}
                                    type="button"
                                    aria-pressed={
                                        activeGroup.type === group.type
                                    }
                                    onClick={() => {
                                        setSimilarGroup(group.type);
                                    }}
                                    className={cn(
                                        "min-h-11 rounded-xl border px-3 py-2 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        activeGroup.type === group.type
                                            ? "border-primary/30 bg-primary/10 text-primary"
                                            : "border-border bg-card text-muted-foreground",
                                    )}
                                >
                                    {t(`groups.${group.type}`)}{" "}
                                    <span className="ms-1 opacity-70">
                                        {group.verses.length}
                                    </span>
                                </button>
                            ))}
                        </fieldset>
                        <StudyVerseList
                            key={activeGroup.type}
                            verses={activeGroup.verses}
                        />
                    </div>
                )}
            </div>

            <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
                {t("source")}
                <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
        </div>
    );
}
