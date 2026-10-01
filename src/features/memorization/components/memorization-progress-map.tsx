"use client";

import {
    BookOpen,
    Check,
    LockKeyhole,
    Pencil,
    Sparkles,
    X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SectionHeading from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import ConfirmationDialog from "@/components/ui/confirmation-dialog";
import { Textarea } from "@/components/ui/textarea";
import type { MemorizationRecordView } from "../server/get-memorization-record";
import {
    askMemorizationCorrection,
    saveMemorizationBaseline,
} from "../server/record-actions";

export default function MemorizationProgressMap({
    record,
}: {
    record: MemorizationRecordView;
}) {
    const t = useTranslations("Memorization");
    const locale = useLocale();
    const router = useRouter();
    const [editing, setEditing] = useState(!record.setupAt);
    const [selected, setSelected] = useState(record.baselineHizbs);
    const [editSnapshot, setEditSnapshot] = useState({
        revision: record.revision,
        setup: !record.setupAt,
        baseline: record.baselineHizbs,
    });
    const detailTrigger = useRef<HTMLButtonElement | null>(null);
    const [review, setReview] = useState(false);
    const [pending, setPending] = useState(false);
    const [requestOpen, setRequestOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [activeHizb, setActiveHizb] = useState<number | null>(null);
    const [now, setNow] = useState(() => Date.parse(record.serverNow));
    const busy = useRef(false);
    useEffect(() => {
        const start = performance.now();
        const tick = () =>
            setNow(Date.parse(record.serverNow) + performance.now() - start);
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [record.serverNow]);
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
    const initialAvailable = Boolean(
        record.setupAt &&
            !record.correctionUsed &&
            record.correctionDeadline &&
            now < Date.parse(record.correctionDeadline),
    );
    const grant = record.request?.status === "approved";
    const canCorrect = initialAvailable || grant;
    const canEdit = !record.setupAt || canCorrect;
    const minutes = Math.max(
        0,
        Math.ceil(
            ((record.correctionDeadline
                ? Date.parse(record.correctionDeadline)
                : now) -
                now) /
                60000,
        ),
    );
    const selectedSorted = [...selected].sort((a, b) => a - b);
    const added = selectedSorted.filter(
        (n) => !editSnapshot.baseline.includes(n),
    );
    const removed = editSnapshot.baseline.filter((n) => !selected.includes(n));
    const changed =
        editSnapshot.setup || added.length > 0 || removed.length > 0;
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
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        try {
            const result = await saveMemorizationBaseline({
                hizbs: selectedSorted,
                setup: editSnapshot.setup,
                revision: editSnapshot.revision,
                confirmed: true,
            });
            if (!result.success) {
                toast.error(
                    t(
                        result.reason === "locked"
                            ? "record.expired"
                            : result.reason === "stale"
                              ? "record.stale"
                              : "updateFailed",
                    ),
                );
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
    async function request() {
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        try {
            const result = await askMemorizationCorrection({ reason });
            if (!result.success) {
                toast.error(t("updateFailed"));
                router.refresh();
                return;
            }
            setRequestOpen(false);
            setReason("");
            toast.success(t("record.requestSent"));
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
            <section className="app-card p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-4">
                    <Sparkles
                        aria-hidden="true"
                        className="size-9 text-primary"
                    />
                    <div className="flex-1">
                        <p className="text-xs text-muted-foreground">
                            {t("progressEyebrow")}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold">
                            {t("dashboard.title", { completed: count })}
                        </h2>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                        {Math.round((count / 60) * 100)}%
                    </p>
                </div>
                <progress
                    max={60}
                    value={count}
                    aria-label={t("mapTitle")}
                    className="mt-4 h-2 w-full overflow-hidden rounded-full accent-primary"
                />
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {t("record.automatic")}
                </p>
            </section>

            {(!record.setupAt || editing) && (
                <section className="app-card space-y-4 border-primary/30 p-5">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <Pencil aria-hidden="true" className="size-5" />
                        {t(
                            record.setupAt
                                ? "record.correctTitle"
                                : "record.setupTitle",
                        )}
                    </h2>
                    <p className="text-sm leading-7 text-muted-foreground">
                        {t(
                            record.setupAt
                                ? "record.correctHint"
                                : "record.setupHint",
                        )}
                    </p>
                    <p className="text-sm">
                        {t("record.baselineReading", {
                            name: t(`record.${record.baselineRiwayah}`),
                        })}
                    </p>
                    {record.setupAt && !canCorrect && (
                        <p className="text-sm text-destructive">
                            {t("record.expired")}
                        </p>
                    )}
                    <p className="text-sm font-medium">
                        {t("record.selected", { count: selected.length })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            disabled={pending || !canEdit || !changed}
                            onClick={() => setReview(true)}
                        >
                            {t("record.review")}
                        </Button>
                        {record.setupAt && (
                            <Button
                                variant="outline"
                                disabled={pending}
                                onClick={() => {
                                    setEditing(false);
                                    setSelected(record.baselineHizbs);
                                }}
                            >
                                {t("record.cancel")}
                            </Button>
                        )}
                    </div>
                </section>
            )}
            {record.setupAt && !editing && (
                <section className="app-card space-y-3 p-5">
                    <p className="flex items-center gap-2 font-medium">
                        <LockKeyhole aria-hidden="true" className="size-4" />
                        {t("record.locked")}
                    </p>
                    {initialAvailable && (
                        <p className="text-sm text-muted-foreground">
                            {t("record.window", {
                                hours: Math.floor(minutes / 60),
                                minutes: minutes % 60,
                            })}
                        </p>
                    )}
                    {grant && (
                        <p className="text-sm text-primary">
                            {t("record.approved")}
                        </p>
                    )}
                    {record.request?.status === "pending" && (
                        <output className="block text-sm text-primary">
                            {t("record.pending")}
                        </output>
                    )}
                    {record.request?.status === "declined" && (
                        <p className="text-sm text-muted-foreground">
                            {t("record.declined")}
                        </p>
                    )}
                    {record.request?.note && (
                        <p className="whitespace-pre-line text-sm leading-7">
                            {record.request.note}
                        </p>
                    )}
                    {canCorrect ? (
                        <Button
                            variant="outline"
                            onClick={() => {
                                setSelected(record.baselineHizbs);
                                setEditSnapshot({
                                    revision: record.revision,
                                    setup: false,
                                    baseline: record.baselineHizbs,
                                });
                                setEditing(true);
                            }}
                        >
                            {t("record.correct")}
                        </Button>
                    ) : (
                        record.request?.status !== "pending" && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    setRequestOpen((value) => !value)
                                }
                            >
                                {t("record.ask")}
                            </Button>
                        )
                    )}
                    {requestOpen &&
                        !canCorrect &&
                        record.request?.status !== "pending" && (
                            <form
                                className="space-y-3"
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    void request();
                                }}
                            >
                                <label
                                    htmlFor="correction-reason"
                                    className="block text-sm"
                                >
                                    {t("record.reason")}
                                </label>
                                <Textarea
                                    id="correction-reason"
                                    minLength={10}
                                    maxLength={1000}
                                    value={reason}
                                    onChange={(event) =>
                                        setReason(event.target.value)
                                    }
                                    required
                                />
                                <Button
                                    disabled={
                                        pending || reason.trim().length < 10
                                    }
                                >
                                    {t("record.send")}
                                </Button>
                            </form>
                        )}
                </section>
            )}

            <section aria-labelledby="hizb-map-title">
                <SectionHeading
                    id="hizb-map-title"
                    title={t("mapTitle")}
                    description={t(
                        editing ? "record.selectHint" : "record.gridHint",
                    )}
                    icon={<BookOpen />}
                />
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{t("legendComplete")}</span>
                    <span>{t("record.partial")}</span>
                    <span>{t("record.needsRevision")}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                        <article key={juz} className="app-card p-3 sm:p-4">
                            <p className="text-xs font-semibold text-muted-foreground">
                                {t("juz", { number: String(juz) })}
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {[juz * 2 - 1, juz * 2].map((number) => {
                                    const hizb = record.hizbs[number - 1];
                                    const filled = editing
                                        ? selected.includes(number)
                                        : hizb.percent === 100;
                                    return (
                                        <button
                                            key={number}
                                            type="button"
                                            disabled={
                                                pending || (editing && !canEdit)
                                            }
                                            aria-pressed={
                                                editing ? filled : undefined
                                            }
                                            aria-label={t(
                                                editing
                                                    ? "record.selectHizb"
                                                    : "record.openHizb",
                                                {
                                                    number,
                                                    percent: hizb.percent,
                                                },
                                            )}
                                            onClick={(event) => {
                                                if (editing)
                                                    setSelected((current) =>
                                                        current.includes(number)
                                                            ? current.filter(
                                                                  (n) =>
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
                                                    setActiveHizb(number);
                                                }
                                            }}
                                            className={`relative flex min-h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${filled ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}
                                        >
                                            {!editing && !filled && (
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
                                                        {hizb.percent}%
                                                    </span>
                                                )
                                            )}
                                            {!editing && hizb.needsRevision && (
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
                                })}
                            </div>
                        </article>
                    ))}
                </div>
            </section>
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
                                    hizbs:
                                        change.previous.join("، ") ||
                                        t("record.none"),
                                })}
                                <br />
                                {t("record.after", {
                                    hizbs:
                                        change.hizbs.join("، ") ||
                                        t("record.none"),
                                })}
                            </p>
                        ))}
                    </div>
                </details>
            )}
            <ConfirmationDialog
                open={review}
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
                confirmLabel={t("record.confirm")}
                cancelLabel={t("record.cancel")}
                pending={pending}
                onConfirm={save}
            >
                <div className="mt-4 space-y-2 text-sm leading-7">
                    <p>
                        {t("record.after", {
                            hizbs:
                                selectedSorted.join("، ") || t("record.none"),
                        })}
                    </p>
                    {record.setupAt && (
                        <>
                            <p>
                                {t("record.added", {
                                    hizbs: added.join("، ") || t("record.none"),
                                })}
                            </p>
                            <p>
                                {t("record.removed", {
                                    hizbs:
                                        removed.join("، ") || t("record.none"),
                                })}
                            </p>
                        </>
                    )}
                </div>
            </ConfirmationDialog>
        </div>
    );
}
