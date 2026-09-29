"use client";

import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCheck,
    List,
    Minus,
    Plus,
    RotateCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ADHKAR, type AdhkarCategory } from "../catalog";
import { incrementRepetition } from "../counter";
import { readingParagraphs } from "../reading-paragraphs";
import { restoreReadingProgress } from "../reading-progress";
import type { AdhkarEntry } from "../types";

export default function AdhkarReader({
    entries,
    category,
    ar,
}: {
    entries: AdhkarEntry[];
    category: AdhkarCategory;
    ar: boolean;
}) {
    const [index, setIndex] = useState(0);
    const [read, setRead] = useState<number[]>([]);
    const [showIndex, setShowIndex] = useState(false);
    const [fontSize, setFontSize] = useState(1);
    const [counts, setCounts] = useState<Record<number, number>>({});
    const [storageReady, setStorageReady] = useState(false);
    const storageKey = `adhkar:${category}`;
    const dayRef = useRef("");
    useEffect(() => {
        function restore() {
            const day = new Date().toLocaleDateString("en-CA");
            if (dayRef.current === day) return;
            dayRef.current = day;
            let saved: unknown = {};
            try {
                saved =
                    JSON.parse(localStorage.getItem(storageKey) || "{}") || {};
            } catch {
                /* Storage is optional. */
            }
            const restored = restoreReadingProgress(
                entries,
                saved,
                day,
                category === "prayer" ? 66 : category === "sleep" ? 99 : 75,
            );
            setIndex(restored.index);
            setRead(restored.read);
            setCounts({});
            setStorageReady(true);
        }
        restore();
        const timer = window.setInterval(restore, 60000);
        window.addEventListener("focus", restore);
        return () => {
            clearInterval(timer);
            window.removeEventListener("focus", restore);
        };
    }, [storageKey, entries, category]);
    useEffect(() => {
        if (!storageReady) return;
        try {
            localStorage.setItem(
                storageKey,
                JSON.stringify({
                    version: 2,
                    day: dayRef.current,
                    currentId: entries[index].ID,
                    read,
                }),
            );
        } catch {
            /* Reading works without storage. */
        }
    }, [storageReady, index, read, storageKey, entries]);
    const textRef = useRef<HTMLElement>(null);
    const entry = entries[index];
    const finished = read.length === entries.length;
    const NextIcon = ar ? ArrowLeft : ArrowRight;
    const PreviousIcon = ar ? ArrowRight : ArrowLeft;

    function goTo(next: number) {
        setIndex(Math.max(0, Math.min(entries.length - 1, next)));
        if (textRef.current) textRef.current.scrollTop = 0;
    }
    function complete() {
        setRead((current) =>
            current.includes(entry.ID) ? current : [...current, entry.ID],
        );
        const next = entries.findIndex(
            (item, position) => position > index && !read.includes(item.ID),
        );
        const firstUnread = entries.findIndex(
            (item) => item.ID !== entry.ID && !read.includes(item.ID),
        );
        if (next >= 0) goTo(next);
        else if (firstUnread >= 0) goTo(firstUnread);
    }
    function countRepetition() {
        const next = incrementRepetition(counts[entry.ID] || 0, entry.repeat);
        setCounts((current) => ({ ...current, [entry.ID]: next.count }));
        if (next.complete) complete();
    }

    return (
        <section
            className="grid items-start gap-4 pb-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6"
            aria-label={ADHKAR[category][ar ? "ar" : "en"]}
        >
            <aside className="rounded-2xl border border-border/60 bg-card/40 p-4 lg:sticky lg:top-24 lg:p-5">
                <div className="mb-3 flex items-center justify-between gap-3 lg:flex-col lg:items-start">
                    <div>
                        <h2 className="text-base font-semibold">
                            {ADHKAR[category][ar ? "ar" : "en"]}
                        </h2>
                        <output className="mt-1 block text-xs tabular-nums text-muted-foreground">
                            {ar
                                ? `قرأت ${read.length} من ${entries.length}`
                                : `${read.length} of ${entries.length} read`}
                        </output>
                    </div>
                    <Button
                        variant="outline"
                        className="min-h-11 rounded-xl border-border/60 bg-background/40 lg:w-full"
                        onClick={() => setShowIndex(!showIndex)}
                        aria-expanded={showIndex}
                        aria-controls="adhkar-index"
                    >
                        <List className="size-4" aria-hidden="true" />
                        {ar ? "الفهرس" : "Jump to"}
                    </Button>
                </div>
                <progress
                    value={read.length}
                    max={entries.length}
                    aria-label={ar ? "تقدّم القراءة" : "Reading progress"}
                    className="mb-3 block h-1 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary"
                />
                {showIndex && (
                    <div
                        id="adhkar-index"
                        className="mb-4 grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-4"
                    >
                        {entries.map((item, position) => (
                            <button
                                key={item.ID}
                                type="button"
                                aria-current={
                                    position === index ? "step" : undefined
                                }
                                aria-label={
                                    ar
                                        ? `الذكر ${position + 1}${read.includes(item.ID) ? "، تمت قراءته" : ""}`
                                        : `Dhikr ${position + 1}${read.includes(item.ID) ? ", read" : ""}`
                                }
                                onClick={() => {
                                    goTo(position);
                                    setShowIndex(false);
                                }}
                                className={`flex min-h-11 items-center justify-center gap-1 rounded-lg border text-sm ${index === position ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-muted"}`}
                            >
                                {position + 1}
                                {read.includes(item.ID) && (
                                    <Check
                                        className="size-3 text-primary"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                )}
                <details className="text-xs leading-6 text-muted-foreground">
                    <summary className="min-h-11 cursor-pointer py-2.5">
                        {ar ? "عن القراءة والمصدر" : "Reading guide & source"}
                    </summary>
                    <p className="text-xs leading-6 text-muted-foreground">
                        {ar
                            ? "يُحفظ تقدّم اليوم على هذا الجهاز. اتّبع العدد والتعليمات المرفقة بكل ذكر؛ ويمكنك تسجيل القراءة دون استخدام العدّاد."
                            : "Today's place is saved on this device. Follow each entry's count and instructions; using the counter is optional."}
                    </p>
                    {(category === "morning" || category === "evening") && (
                        <details className="mt-4 border-t pt-3 text-xs leading-6 text-muted-foreground">
                            <summary className="min-h-11 cursor-pointer">
                                {ar
                                    ? "عن صيغة الصباح والمساء"
                                    : "Morning and evening wording"}
                            </summary>
                            <p>
                                {ar
                                    ? "فُصلت صيغ الصباح والمساء بحسب تنبيهات المصدر، وأُبقي النص الأصلي في تفاصيل كل ذكر للمراجعة."
                                    : "Morning and evening wording follows the source's instructions. The original text is available in each entry's details."}
                            </p>
                        </details>
                    )}
                    <a
                        href="/legal/adhkar.txt"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex min-h-11 items-center text-xs text-muted-foreground underline underline-offset-4"
                    >
                        {ar
                            ? "مصدر البيانات والترخيص"
                            : "Dataset attribution & license"}
                    </a>
                </details>
            </aside>
            <div className="min-w-0">
                <article className="overflow-hidden rounded-2xl border bg-card shadow-sm sm:rounded-3xl">
                    <div className="flex items-center justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground sm:px-6">
                        <span aria-live="polite">
                            {ar
                                ? `الذكر ${index + 1} من ${entries.length}`
                                : `Dhikr ${index + 1} of ${entries.length}`}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0"
                                disabled={fontSize === 0}
                                aria-label={ar ? "تصغير النص" : "Smaller text"}
                                onClick={() => setFontSize(fontSize - 1)}
                            >
                                <Minus className="size-4" />
                            </Button>
                            <span aria-hidden="true">{ar ? "ع" : "Aa"}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0"
                                disabled={fontSize === 3}
                                aria-label={ar ? "تكبير النص" : "Larger text"}
                                onClick={() => setFontSize(fontSize + 1)}
                            >
                                <Plus className="size-4" />
                            </Button>
                        </div>
                    </div>
                    <section
                        ref={textRef}
                        // biome-ignore lint/a11y/noNoninteractiveTabindex: Allows keyboard scrolling of long passages.
                        tabIndex={0}
                        aria-label={
                            ar
                                ? "نص الذكر، مرّر لقراءة النص الطويل"
                                : "Dhikr text; scroll for longer passages"
                        }
                        className="flex h-[clamp(15rem,42svh,24rem)] flex-col overflow-y-auto overscroll-contain px-4 py-5 [overflow-anchor:none] [scrollbar-gutter:stable_both-edges] sm:px-8 sm:py-6 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-primary"
                    >
                        {entry.ARABIC_TEXT && (
                            <div
                                dir="rtl"
                                lang="ar"
                                className="ayah flex w-full shrink-0 flex-col gap-3 whitespace-pre-wrap break-words text-center leading-[2.1] [tab-size:4]"
                                style={{
                                    fontSize: `clamp(${[1.25, 1.45, 1.7, 2][fontSize]}rem, 3.5vw, ${[1.4, 1.7, 2, 2.3][fontSize]}rem)`,
                                }}
                            >
                                {readingParagraphs(entry.ARABIC_TEXT).map(
                                    (paragraph) => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ),
                                )}
                            </div>
                        )}
                        {(entry.notes || entry.review) && (
                            <div className="mt-auto shrink-0 space-y-4 pt-5">
                                {entry.notes && (
                                    <div
                                        dir="rtl"
                                        lang="ar"
                                        className="whitespace-pre-wrap border-s-2 border-primary/30 ps-4 text-sm leading-8 text-muted-foreground"
                                    >
                                        {entry.notes}
                                    </div>
                                )}
                                {entry.review && (
                                    <p className="border-t bg-muted/40 px-3 py-3 text-xs leading-6 text-muted-foreground">
                                        {ar
                                            ? "اتّبع التعليمات المرفقة؛ لا نعرض عددًا موحّدًا لهذا الذكر. يمكنك الاطّلاع على تفاصيل المراجعة أدناه."
                                            : "Follow the accompanying instructions; this entry has no single count target. See the review details below."}
                                    </p>
                                )}
                            </div>
                        )}
                    </section>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t px-3 py-3 sm:px-6">
                        <div>
                            <p className="text-sm font-medium">
                                {ar
                                    ? "اضغط مع كل تكرار"
                                    : "Tap for each repetition"}
                            </p>
                            <p className="mt-1 hidden h-10 text-xs leading-5 text-muted-foreground sm:block">
                                {entry.repeat !== null
                                    ? ar
                                        ? "ينتقل تلقائيًا عند اكتمال العدد"
                                        : "Continues automatically at the target"
                                    : ar
                                      ? "اتّبع عدد التكرار الوارد في النص"
                                      : "Follow the repetition instructions in the text"}
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-11 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                                disabled={!counts[entry.ID]}
                                aria-label={
                                    ar ? "تصفير العدّاد" : "Reset counter"
                                }
                                onClick={() =>
                                    setCounts((current) => ({
                                        ...current,
                                        [entry.ID]: 0,
                                    }))
                                }
                            >
                                <RotateCcw className="size-4" />
                            </Button>
                            <button
                                type="button"
                                aria-label={
                                    ar
                                        ? `إضافة تكرار، العدد الحالي ${counts[entry.ID] || 0}`
                                        : `Add repetition, current count ${counts[entry.ID] || 0}`
                                }
                                onClick={countRepetition}
                                className="group relative isolate flex size-18 shrink-0 touch-manipulation flex-col items-center justify-center rounded-full bg-primary/5 text-primary transition-colors hover:bg-primary/10 active:bg-primary/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                            >
                                <svg
                                    viewBox="0 0 72 72"
                                    className="pointer-events-none absolute inset-0 size-full -rotate-90"
                                    aria-hidden="true"
                                >
                                    <circle
                                        cx="36"
                                        cy="36"
                                        r="33"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="opacity-15"
                                    />
                                    <circle
                                        cx="36"
                                        cy="36"
                                        r="33"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        pathLength="100"
                                        strokeDasharray="100"
                                        strokeDashoffset={
                                            100 -
                                            (entry.repeat
                                                ? Math.min(
                                                      (counts[entry.ID] || 0) /
                                                          entry.repeat,
                                                      1,
                                                  ) * 100
                                                : 0)
                                        }
                                    />
                                </svg>
                                <span className="text-2xl font-semibold leading-none tabular-nums">
                                    <bdi>{counts[entry.ID] || 0}</bdi>
                                </span>
                                <span className="mt-1 text-[10px] leading-none text-muted-foreground">
                                    {entry.repeat !== null
                                        ? ar
                                            ? `من ${entry.repeat}`
                                            : `of ${entry.repeat}`
                                        : ar
                                          ? "تكرار"
                                          : "repetitions"}
                                </span>
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 border-t bg-muted/40 p-3 sm:px-6">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={index === 0}
                            className="size-12 shrink-0"
                            onClick={() => goTo(index - 1)}
                            aria-label={ar ? "الذكر السابق" : "Previous dhikr"}
                        >
                            <PreviousIcon className="size-4" />
                        </Button>
                        <Button
                            className="h-12 min-w-0 flex-1 rounded-xl"
                            disabled={finished}
                            onClick={complete}
                        >
                            <Check className="size-4" aria-hidden="true" />
                            {read.includes(entry.ID)
                                ? ar
                                    ? "متابعة القراءة"
                                    : "Continue reading"
                                : ar
                                  ? "قرأت الذكر، التالي"
                                  : "Read, continue"}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={index === entries.length - 1}
                            className="size-12 shrink-0"
                            onClick={() => goTo(index + 1)}
                            aria-label={
                                ar
                                    ? "الذكر التالي دون تسجيل القراءة"
                                    : "Next dhikr without marking read"
                            }
                        >
                            <NextIcon className="size-4" />
                        </Button>
                    </div>
                    <details
                        key={entry.ID}
                        className="border-t px-4 text-xs leading-6 text-muted-foreground sm:px-6"
                    >
                        <summary className="min-h-11 cursor-pointer py-3">
                            {ar
                                ? "النص الأصلي وتفاصيل المراجعة"
                                : "Original text & review details"}
                        </summary>
                        <a
                            href={`https://www.hisnmuslim.com/api/ar/${ADHKAR[category].chapter}.json`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary underline underline-offset-4"
                        >
                            {ar ? "المصدر" : "Source"} · {entry.sourceId}
                        </a>
                        <p
                            dir="rtl"
                            lang="ar"
                            className="mt-3 whitespace-pre-wrap text-right"
                        >
                            {entry.originalText}
                        </p>
                        <p className="my-3">
                            {entry.review
                                ? ar
                                    ? "لهذا الذكر تعليمات خاصة أو عدد يحتاج إلى مراجعة؛ لم نفرض عددًا واحدًا للتكرار."
                                    : "This entry has special instructions or a count requiring review; no single target is imposed."
                                : entry.countBasis === "source-metadata"
                                  ? ar
                                      ? "العدد من بيانات المصدر، وليس مراجعة مستقلة للحديث."
                                      : "Count retained from source metadata; not an independent hadith verification."
                                  : ar
                                    ? "العدد مستخرج من تعليمات النص أو المرجع المرفق."
                                    : "Count checked against the textual instructions or linked reference."}
                        </p>
                        {entry.reference && (
                            <a
                                href={entry.reference}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-block text-primary underline"
                            >
                                {ar ? "مرجع العدد" : "Count reference"}
                            </a>
                        )}
                    </details>
                </article>
                {finished && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
                        <div className="flex items-center gap-3">
                            <CheckCheck
                                className="size-5 text-primary"
                                aria-hidden="true"
                            />
                            <p className="text-sm font-medium">
                                {ar
                                    ? "أتممت قراءة هذه المجموعة. تقبّل الله منك."
                                    : "You’ve read this collection. May Allah accept it."}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setRead([]);
                                setCounts({});
                                goTo(0);
                            }}
                        >
                            <RotateCcw className="size-4" aria-hidden="true" />
                            {ar ? "البدء من جديد" : "Start again"}
                        </Button>
                    </div>
                )}

                {
                    <button
                        type="button"
                        className={`min-h-11 w-full text-xs text-muted-foreground underline underline-offset-4 ${read.includes(entry.ID) ? "" : "invisible"}`}
                        disabled={!read.includes(entry.ID)}
                        onClick={() =>
                            setRead((current) =>
                                current.filter((id) => id !== entry.ID),
                            )
                        }
                    >
                        {ar
                            ? "سجّلت القراءة بالخطأ؟ تراجع"
                            : "Marked read by mistake? Undo"}
                    </button>
                }
            </div>
        </section>
    );
}
