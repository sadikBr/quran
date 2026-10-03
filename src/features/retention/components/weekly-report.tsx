"use client";
import {
    BarChart3,
    BookOpenCheck,
    CalendarDays,
    NotebookPen,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import PageHeading from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import type { WeeklyReport as Report } from "../server/report";

export default function WeeklyReport({
    report,
    surahs,
}: {
    report: Report;
    surahs: { number: number; name: string; englishName: string }[];
}) {
    const t = useTranslations("Memorization.retention"),
        locale = useLocale();
    const date = (iso: string) =>
        new Intl.DateTimeFormat(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        }).format(new Date(`${iso}T12:00:00Z`));
    const name = (n: number) =>
        locale === "ar" ? surahs[n - 1]?.name : surahs[n - 1]?.englishName;
    const open = report.pendingMemorization + report.pendingRevision;
    const stats = [
        { key: "newAyahs", count: report.learned, icon: Sparkles },
        { key: "reviewedAyahs", count: report.reviewed, icon: BookOpenCheck },
        { key: "activeDays", count: report.activityDays, icon: CalendarDays },
        {
            key: "focusedSessions",
            count: report.focusedPractices,
            icon: NotebookPen,
        },
    ] as const;
    return (
        <div className="space-y-6">
            <PageHeading
                title={t("report")}
                description={t("reportDescription")}
                icon={<BarChart3 />}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-semibold">
                        {date(report.weekStart)} — {date(report.weekEnd)}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {report.timezone} · {t(report.riwayah)}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {report.offset > -51 && (
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 rounded-xl"
                        >
                            <Link
                                href={`/memorization/report?week=${report.offset - 1}`}
                            >
                                {t("previousWeek")}
                            </Link>
                        </Button>
                    )}
                    {report.offset < 0 && (
                        <>
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-11 rounded-xl"
                            >
                                <Link
                                    href={`/memorization/report?week=${report.offset + 1}`}
                                >
                                    {t("nextWeek")}
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                className="min-h-11 rounded-xl"
                            >
                                <Link href="/memorization/report">
                                    {t("thisWeek")}
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {stats.map(({ key, count, icon: Icon }) => (
                    <article key={key} className="app-card min-w-0 p-4 sm:p-6">
                        <Icon
                            className="mb-4 size-5 text-primary"
                            aria-hidden="true"
                        />
                        <p className="text-3xl font-semibold tabular-nums">
                            {count.toLocaleString(locale)}
                        </p>
                        <h3 className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t(key)}
                        </h3>
                    </article>
                ))}
            </div>
            <p className="text-xs leading-6 text-muted-foreground">
                {t("reportCountHint")}
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
                <section className="app-card p-5 sm:p-6">
                    <h2 className="font-semibold">{t("weeklySessions")}</h2>
                    <dl className="mt-4 space-y-4 text-sm">
                        {[
                            ["completedNew", report.completedMemorization],
                            ["completedReview", report.completedRevision],
                            ["openNew", report.pendingMemorization],
                            ["openReview", report.pendingRevision],
                            ["difficultAyahs", report.difficult],
                        ].map(([key, count]) => (
                            <div
                                key={key}
                                className="flex items-start justify-between gap-4"
                            >
                                <dt className="leading-6 text-muted-foreground">
                                    {t(key as "completedNew")}
                                </dt>
                                <dd className="shrink-0 font-semibold tabular-nums">
                                    {count}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <p className="mt-5 text-xs leading-6 text-muted-foreground">
                        {t("openHint")}
                    </p>
                </section>
                <section className="app-card p-5 sm:p-6">
                    <h2 className="font-semibold">
                        {t("recurringDifficulties")}
                    </h2>
                    {report.mistakes.length ? (
                        <ul className="mt-4 space-y-3">
                            {report.mistakes.map((m) => (
                                <li
                                    key={m.id}
                                    className="flex items-start justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {name(m.surahNumber)} ·{" "}
                                            {t("ayahNumber", {
                                                number: m.ayahNumber,
                                            })}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {t(`kinds.${m.kind}`)} ·{" "}
                                            {t(m.riwayah)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                                        {t("times", { count: m.count })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 text-sm leading-7 text-muted-foreground">
                            {t("noDifficulties")}
                        </p>
                    )}
                    <Button
                        asChild
                        variant="outline"
                        className="mt-5 min-h-11 rounded-xl"
                    >
                        <Link href="/memorization/mistakes">
                            {t("openNotebook")}
                        </Link>
                    </Button>
                </section>
            </div>
            <section className="rounded-3xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-7">
                <h2 className="font-semibold text-primary">{t("nextSteps")}</h2>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {t(open ? "adjustHint" : "steadyHint", { count: open })}
                </p>
                <p className="mt-2 text-sm leading-7">
                    {t("followUpCount", { count: report.followUps })}
                    {report.nextFollowUp &&
                        ` · ${t("dueFrom", { date: date(report.nextFollowUp) })}`}
                </p>
                {!report.revisionEnabled && (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("revisionPaused")}
                    </p>
                )}
                {!report.learningEnabled && (
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {t("learningPaused")}
                    </p>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                    <Button
                        asChild
                        className="min-h-11 rounded-xl whitespace-normal"
                    >
                        <Link href="/memorization/plan">
                            {t("adjustMemorization")}
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-11 rounded-xl whitespace-normal"
                    >
                        <Link href="/memorization/revision">
                            {t("adjustRevision")}
                        </Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
