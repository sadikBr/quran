"use client";

import { BookOpen, Check, Info, Pencil, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SectionHeading from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import type { SurahOption } from "@/features/practice/components/quran-range-selector";
import type { BaselineRange } from "../progress";
import type { MemorizationRecordView } from "../server/get-memorization-record";
import { saveMemorizationBaseline } from "../server/record-actions";
import BaselineRangeEditor, { baselineRangeKey } from "./baseline-range-editor";
import MemorizationOverview from "./memorization-overview";

export default function MemorizationProgressMap({
    record,
    surahs,
}: {
    record: MemorizationRecordView;
    surahs: SurahOption[];
}) {
    const t = useTranslations("Memorization");
    const locale = useLocale();
    const router = useRouter();
    const [editing, setEditing] = useState(!record.setupAt);
    const [selected, setSelected] = useState(record.baselineHizbs);
    const [ranges, setRanges] = useState(record.baselineRanges);
    const [unit, setUnit] = useState<"surah" | "hizb">("surah");
    const [editSnapshot, setEditSnapshot] = useState({
        revision: record.revision,
        setup: !record.setupAt,
        baseline: record.baselineHizbs,
        ranges: record.baselineRanges,
    });
    const detailTrigger = useRef<HTMLButtonElement | null>(null);
    const [review, setReview] = useState(false);
    const [pending, setPending] = useState(false);
    const [activeHizb, setActiveHizb] = useState<number | null>(null);
    const busy = useRef(false);
    useEffect(() => {
        const timer = setInterval(() => {
            if (document.visibilityState === "visible") router.refresh();
        }, 30_000);
        const refresh = () => {
            if (document.visibilityState === "visible") router.refresh();
        };
        document.addEventListener("visibilitychange", refresh);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
        };
    }, [router]);
    const stale = editing && record.revision !== editSnapshot.revision;
    function startEditing() {
        setSelected(record.baselineHizbs);
        setRanges(record.baselineRanges);
        setEditSnapshot({
            revision: record.revision,
            setup: !record.setupAt,
            baseline: record.baselineHizbs,
            ranges: record.baselineRanges,
        });
        setReview(false);
        setEditing(true);
    }
    const formatHizbs = (hizbs: number[]) =>
        hizbs.length
            ? new Intl.ListFormat(locale).format(
                  hizbs.map((number) =>
                      new Intl.NumberFormat(locale).format(number),
                  ),
              )
            : t("record.none");
    const selectedSorted = [...selected].sort((a, b) => a - b);
    const added = selectedSorted.filter(
        (n) => !editSnapshot.baseline.includes(n),
    );
    const removed = editSnapshot.baseline.filter((n) => !selected.includes(n));
    const addedRanges = ranges.filter(
        (r) =>
            !editSnapshot.ranges.some(
                (old) => baselineRangeKey(old) === baselineRangeKey(r),
            ),
    );
    const removedRanges = editSnapshot.ranges.filter(
        (r) =>
            !ranges.some(
                (next) => baselineRangeKey(next) === baselineRangeKey(r),
            ),
    );
    const rangeLabel = (range: BaselineRange) => {
        const surah = surahs.find((s) => s.number === range.surahNumber);
        const name =
            (locale === "ar" ? surah?.name : surah?.englishName) ??
            String(range.surahNumber);
        return range.startAyahNumber === 1 &&
            range.endAyahNumber === surah?.numberOfAyahs
            ? t("record.wholeSurahLabel", { name })
            : t("record.rangeLabel", {
                  name,
                  start: range.startAyahNumber,
                  end: range.endAyahNumber,
              });
    };
    const changed =
        editSnapshot.setup ||
        added.length > 0 ||
        removed.length > 0 ||
        addedRanges.length > 0 ||
        removedRanges.length > 0;
    const detail = record.hizbs.find((item) => item.number === activeHizb);
    const count = record.completedHizbs.length;
    const dates = (date: string) =>
        new Date(date).toLocaleDateString(locale, {
            day: "numeric",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
        });
    async function save() {
        if (busy.current || stale || !changed) return;
        busy.current = true;
        setPending(true);
        try {
            const result = await saveMemorizationBaseline({
                hizbs: selectedSorted,
                ranges,
                setup: editSnapshot.setup,
                revision: editSnapshot.revision,
                confirmed: true,
            });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "stale"
                            ? "record.stale"
                            : "updateFailed",
                    ),
                );
                setReview(false);
                router.refresh();
                return;
            }
            setEditing(false);
            setReview(false);
            toast.success(t("record.saved"));
            router.refresh();
        } catch {
            toast.error(t("updateFailed"));
        } finally {
            busy.current = false;
            setPending(false);
        }
    }
    return (
        <div className="mt-6 space-y-6">
            <MemorizationOverview
                completed={count}
                memorizedAyahs={record.memorizedAyahs}
                progressHizbs={record.progressHizbs}
                setup={Boolean(record.setupAt)}
            />

            {editing ? (
                <section className="app-card space-y-3 border-primary/30 p-5">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Pencil aria-hidden="true" className="size-5" />
                        {t(
                            editSnapshot.setup
                                ? "record.setupTitle"
                                : "record.correctTitle",
                        )}
                    </h2>
                    <p className="text-sm leading-7 text-muted-foreground">
                        {t(
                            editSnapshot.setup
                                ? "record.setupHint"
                                : "record.correctHint",
                        )}
                    </p>
                    <p className="text-sm">
                        {t("record.baselineReading", {
                            name: t(`record.${record.baselineRiwayah}`),
                        })}
                    </p>
                    <fieldset
                        aria-label={t("record.selectionMethod")}
                        className="flex flex-wrap gap-2"
                    >
                        <Button
                            variant={unit === "surah" ? "default" : "outline"}
                            aria-pressed={unit === "surah"}
                            onClick={() => setUnit("surah")}
                        >
                            {t("record.surahsAndAyahs")}
                        </Button>
                        <Button
                            variant={unit === "hizb" ? "default" : "outline"}
                            aria-pressed={unit === "hizb"}
                            onClick={() => setUnit("hizb")}
                        >
                            {t("record.wholeHizbs")}
                        </Button>
                    </fieldset>
                    {stale && (
                        <div
                            role="alert"
                            className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
                        >
                            <p className="text-sm leading-7">
                                {t("record.stale")}
                            </p>
                            <Button
                                variant="outline"
                                disabled={pending}
                                onClick={startEditing}
                            >
                                {t("record.reload")}
                            </Button>
                        </div>
                    )}
                </section>
            ) : (
                <section
                    aria-label={t("record.startingRecord")}
                    className="border-b border-border/45 px-1 pb-5"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <div className="min-w-0 space-y-1.5">
                            <h2 className="text-sm font-medium">
                                {t("record.startingRecord")}
                            </h2>
                            <p className="text-sm leading-7 text-muted-foreground">
                                {t("record.editHint")}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            disabled={pending}
                            className="min-h-11 shrink-0 self-start sm:self-center"
                            onClick={startEditing}
                        >
                            <Pencil aria-hidden="true" className="size-4" />
                            {t("record.correct")}
                        </Button>
                    </div>
                    {record.baselineRanges.length > 0 && (
                        <details
                            className="mt-4 text-sm"
                            open={record.baselineRanges.length <= 5}
                        >
                            <summary className="cursor-pointer font-medium">
                                {t("record.selectedPassages")}
                            </summary>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {record.baselineRanges.map((range) => (
                                    <li
                                        key={baselineRangeKey(range)}
                                        className="rounded-lg bg-primary/5 px-3 py-2 leading-6"
                                    >
                                        {rangeLabel(range)}
                                    </li>
                                ))}
                            </ul>
                        </details>
                    )}
                </section>
            )}

            {editing && unit === "surah" && (
                <BaselineRangeEditor
                    surahs={surahs}
                    ranges={ranges}
                    disabled={pending || stale}
                    onChange={setRanges}
                    label={rangeLabel}
                />
            )}
            {(!editing || unit === "hizb") && (
                <section aria-labelledby="hizb-map-title">
                    <SectionHeading
                        id="hizb-map-title"
                        title={t("mapTitle")}
                        description={t(
                            editing ? "record.selectHint" : "record.gridHint",
                        )}
                        icon={<BookOpen />}
                    />
                    {!editing && (
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>{t("legendComplete")}</span>
                            <span>{t("record.partial")}</span>
                            <span className="text-sky-600 dark:text-sky-400">
                                {t("learning.upcoming")}
                            </span>
                            <span>{t("record.needsRevision")}</span>
                        </div>
                    )}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(
                            (juz) => (
                                <article
                                    key={juz}
                                    className="app-card p-3 sm:p-4"
                                >
                                    <p className="text-xs font-semibold text-muted-foreground">
                                        {t("juz", { number: String(juz) })}
                                    </p>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        {[juz * 2 - 1, juz * 2].map(
                                            (number) => {
                                                const hizb =
                                                    record.hizbs[number - 1];
                                                const filled = editing
                                                    ? selected.includes(number)
                                                    : hizb.percent === 100;
                                                return (
                                                    <button
                                                        key={number}
                                                        type="button"
                                                        disabled={
                                                            pending || stale
                                                        }
                                                        aria-pressed={
                                                            editing
                                                                ? filled
                                                                : undefined
                                                        }
                                                        aria-label={t(
                                                            editing
                                                                ? "record.selectHizb"
                                                                : "record.openHizb",
                                                            {
                                                                number,
                                                                percent:
                                                                    hizb.percent,
                                                            },
                                                        )}
                                                        onClick={(event) => {
                                                            if (editing)
                                                                setSelected(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        current.includes(
                                                                            number,
                                                                        )
                                                                            ? current.filter(
                                                                                  (
                                                                                      n,
                                                                                  ) =>
                                                                                      n !==
                                                                                      number,
                                                                              )
                                                                            : [
                                                                                  ...current,
                                                                                  number,
                                                                              ],
                                                                );
                                                            else {
                                                                detailTrigger.current =
                                                                    event.currentTarget;
                                                                setActiveHizb(
                                                                    number,
                                                                );
                                                            }
                                                        }}
                                                        className={`relative flex min-h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${filled ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
                                                    >
                                                        {!editing &&
                                                            !filled && (
                                                                <span
                                                                    aria-hidden="true"
                                                                    className="absolute inset-x-0 bottom-0 bg-primary/15"
                                                                    style={{
                                                                        height: `${hizb.percent}%`,
                                                                    }}
                                                                />
                                                            )}
                                                        <span className="relative">
                                                            {number}
                                                        </span>
                                                        {filled ? (
                                                            <Check
                                                                aria-hidden="true"
                                                                className="relative size-4"
                                                            />
                                                        ) : (
                                                            !editing && (
                                                                <span className="relative text-xs">
                                                                    {
                                                                        hizb.percent
                                                                    }
                                                                    %
                                                                </span>
                                                            )
                                                        )}
                                                        {editing &&
                                                            !editSnapshot.setup &&
                                                            (added.includes(
                                                                number,
                                                            ) ||
                                                                removed.includes(
                                                                    number,
                                                                )) && (
                                                                <span className="relative text-xs">
                                                                    {t(
                                                                        added.includes(
                                                                            number,
                                                                        )
                                                                            ? "record.addition"
                                                                            : "record.removal",
                                                                    )}
                                                                </span>
                                                            )}
                                                        {!editing &&
                                                            hizb.upcoming >
                                                                0 && (
                                                                <span className="relative text-xs text-sky-600 dark:text-sky-400">
                                                                    {t(
                                                                        "learning.upcomingCount",
                                                                        {
                                                                            count: hizb.upcoming,
                                                                        },
                                                                    )}
                                                                </span>
                                                            )}
                                                        {!editing &&
                                                            hizb.needsRevision && (
                                                                <span
                                                                    role="img"
                                                                    aria-label={t(
                                                                        "record.needsRevision",
                                                                    )}
                                                                    className="absolute end-1 top-1 size-2 rounded-full bg-amber-500 ring-1 ring-background"
                                                                />
                                                            )}
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                </article>
                            ),
                        )}
                    </div>
                </section>
            )}
            {editing && (
                <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/95 p-4 shadow-lg backdrop-blur-sm">
                    <output className="text-sm font-medium" aria-live="polite">
                        {t("record.selectionSummary", {
                            hizbs: selected.length,
                            passages: ranges.length,
                        })}
                    </output>
                    <div className="flex flex-wrap gap-2">
                        {record.setupAt && (
                            <Button
                                variant="outline"
                                disabled={pending}
                                onClick={() => {
                                    setEditing(false);
                                    setReview(false);
                                    setSelected(record.baselineHizbs);
                                    setRanges(record.baselineRanges);
                                }}
                            >
                                {t("record.cancel")}
                            </Button>
                        )}
                        <Button
                            disabled={pending || stale || !changed}
                            onClick={() => setReview(true)}
                        >
                            {t(
                                editSnapshot.setup
                                    ? "record.review"
                                    : "record.reviewChanges",
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <Dialog.Root
                open={Boolean(detail && !editing)}
                onOpenChange={(open) => {
                    if (!open) setActiveHizb(null);
                }}
            >
                {detail && (
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm" />
                        <Dialog.Content
                            dir={locale === "ar" ? "rtl" : "ltr"}
                            lang={locale}
                            onCloseAutoFocus={(event) => {
                                if (detailTrigger.current?.isConnected) {
                                    event.preventDefault();
                                    detailTrigger.current.focus();
                                }
                            }}
                            className="fixed start-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 space-y-4 overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl rtl:translate-x-1/2 sm:p-6"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <Dialog.Title className="text-lg font-semibold">
                                    {t("record.hizbDetail", {
                                        number: detail.number,
                                    })}
                                </Dialog.Title>
                                <Dialog.Close asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={t("record.close")}
                                    >
                                        <X aria-hidden="true" />
                                    </Button>
                                </Dialog.Close>
                            </div>
                            <Dialog.Description>
                                {t("record.coverage", {
                                    completed: detail.completed,
                                    total: detail.total,
                                })}
                            </Dialog.Description>
                            <p className="text-xs leading-7 text-muted-foreground">
                                {t("record.sources", {
                                    baseline: detail.baseline,
                                    self: detail.self,
                                    peer: detail.peer,
                                })}
                            </p>
                            {detail.upcoming > 0 && (
                                <div className="space-y-2 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
                                    <p className="text-sm font-medium">
                                        {t("learning.upcomingCount", {
                                            count: detail.upcoming,
                                        })}
                                    </p>
                                    {detail.planned.map((p, i) => (
                                        <p
                                            key={`${p.scheduledDate}:${i}`}
                                            className="text-xs leading-6"
                                        >
                                            {p.scheduledDate} ·{" "}
                                            {p.startSurahNumber}:
                                            {p.startAyahNumber} –{" "}
                                            {p.endSurahNumber}:{p.endAyahNumber}
                                        </p>
                                    ))}
                                    <Link
                                        href="/memorization/plan"
                                        className="inline-block text-sm text-primary underline underline-offset-4"
                                    >
                                        {t("learning.openPlan")}
                                    </Link>
                                </div>
                            )}
                            {detail.needsRevision && (
                                <p className="text-sm text-amber-700 dark:text-amber-400">
                                    {t("record.needsRevision")}
                                </p>
                            )}
                            <div className="flex flex-wrap gap-2">
                                <Button asChild>
                                    <Link
                                        href={`/practice?hizb=${detail.number}#practice-range`}
                                    >
                                        {t("record.practice")}
                                    </Link>
                                </Button>
                                {detail.start && (
                                    <Button asChild variant="outline">
                                        <Link
                                            href={`/quran/page/${detail.start.page}`}
                                        >
                                            {t("record.read")}
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <h3 className="text-sm font-semibold">
                                {t("record.history")}
                            </h3>
                            {record.assessments
                                .filter((a) => detail.historyIds.includes(a.id))
                                .reverse()
                                .map((a) => (
                                    <p
                                        key={a.id}
                                        className="border-t border-border/50 pt-3 text-sm leading-7"
                                    >
                                        {t(`record.${a.method}`)} ·{" "}
                                        {t(`record.${a.outcome}`)} ·{" "}
                                        <bdi>
                                            {a.start}–{a.end}
                                        </bdi>{" "}
                                        · {t(`record.${a.riwayah}`)} ·{" "}
                                        {dates(a.date)}
                                    </p>
                                ))}
                            {!detail.historyIds.length && (
                                <p className="text-sm text-muted-foreground">
                                    {t("record.noAssessments")}
                                </p>
                            )}
                        </Dialog.Content>
                    </Dialog.Portal>
                )}
            </Dialog.Root>
            {!!record.changes.length && (
                <details className="app-card p-5">
                    <summary className="cursor-pointer text-sm font-semibold">
                        {t("record.baselineHistory")}
                    </summary>
                    <div className="mt-3 space-y-3">
                        {record.changes.map((change) => (
                            <p
                                key={change.id}
                                className="border-t border-border/50 pt-3 text-sm leading-7"
                            >
                                {t(`record.change_${change.source}`)} ·{" "}
                                {dates(change.date)}
                                <br />
                                {t("record.before", {
                                    hizbs: formatHizbs(change.previous),
                                })}
                                <br />
                                {t("record.after", {
                                    hizbs: formatHizbs(change.hizbs),
                                })}
                                {(change.previousRanges.length > 0 ||
                                    change.ranges.length > 0) && (
                                    <>
                                        <br />
                                        {t("record.previousPassages", {
                                            passages:
                                                change.previousRanges
                                                    .map(rangeLabel)
                                                    .join(" · ") ||
                                                t("record.none"),
                                        })}
                                        <br />
                                        {t("record.currentPassages", {
                                            passages:
                                                change.ranges
                                                    .map(rangeLabel)
                                                    .join(" · ") ||
                                                t("record.none"),
                                        })}
                                    </>
                                )}
                            </p>
                        ))}
                    </div>
                </details>
            )}
            <ConfirmationDialog
                open={review && !stale}
                onOpenChange={setReview}
                title={t(
                    editSnapshot.setup
                        ? "record.confirmSetup"
                        : "record.confirmCorrection",
                )}
                description={t(
                    editSnapshot.setup
                        ? "record.confirmSetupHint"
                        : "record.confirmCorrectionHint",
                )}
                confirmLabel={t(
                    editSnapshot.setup
                        ? "record.confirm"
                        : "record.saveCorrection",
                )}
                cancelLabel={t("record.backToSelection")}
                pending={pending}
                onConfirm={save}
            >
                <div className="mt-4 space-y-4 text-sm">
                    {!editSnapshot.setup &&
                        (added.length > 0 || removed.length > 0) && (
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                                    <p className="font-medium">
                                        {t("record.additions")}
                                    </p>
                                    <p className="mt-2 leading-7">
                                        {formatHizbs(added)}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-muted/30 p-3">
                                    <p className="font-medium">
                                        {t("record.removals")}
                                    </p>
                                    <p className="mt-2 leading-7">
                                        {formatHizbs(removed)}
                                    </p>
                                </div>
                            </div>
                        )}
                    {(selectedSorted.length > 0 ||
                        removed.length > 0 ||
                        ranges.length === 0) && (
                        <p className="leading-7">
                            {t("record.after", {
                                hizbs: formatHizbs(selectedSorted),
                            })}
                        </p>
                    )}
                    {(ranges.length > 0 || removedRanges.length > 0) && (
                        <div className="space-y-3">
                            {editSnapshot.setup ? (
                                <>
                                    <p className="font-medium">
                                        {t("record.selectedPassages")}
                                    </p>
                                    <ul className="space-y-1">
                                        {ranges.map((r) => (
                                            <li key={baselineRangeKey(r)}>
                                                {rangeLabel(r)}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium">
                                        {t("record.addedPassages")}
                                    </p>
                                    <p className="leading-7">
                                        {addedRanges
                                            .map(rangeLabel)
                                            .join(" · ") || t("record.none")}
                                    </p>
                                    <p className="font-medium">
                                        {t("record.removedPassages")}
                                    </p>
                                    <p className="leading-7">
                                        {removedRanges
                                            .map(rangeLabel)
                                            .join(" · ") || t("record.none")}
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                    {!editSnapshot.setup &&
                        (removed.length > 0 || removedRanges.length > 0) && (
                            <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-muted-foreground">
                                <Info
                                    aria-hidden="true"
                                    className="mt-1 size-4 shrink-0"
                                />
                                <p className="leading-7">
                                    {t("record.preservedProgress")}
                                </p>
                            </div>
                        )}
                    {!editSnapshot.setup && (
                        <p className="text-sm leading-7 text-muted-foreground">
                            {t("record.revisionSync")}
                        </p>
                    )}
                </div>
            </ConfirmationDialog>
        </div>
    );
}
