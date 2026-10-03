"use client";

import { ArrowRight, BookMarked, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TodayPlanSession } from "../today-practice";
import { type PlanSurah, usePlanFormatting } from "./weekly-plan-ui";

export default function TodayPlanPractice({
    sessions,
    surahs,
}: {
    sessions: TodayPlanSession[];
    surahs: PlanSurah[];
}) {
    const t = useTranslations("Practice");
    const plans = useTranslations("Memorization.plans");
    const locale = useLocale();
    const { range, date } = usePlanFormatting(surahs);
    const router = useRouter();
    useEffect(() => {
        const refresh = () => {
            if (document.visibilityState === "visible") router.refresh();
        };
        const timer = window.setInterval(refresh, 60_000);
        document.addEventListener("visibilitychange", refresh);
        window.addEventListener("focus", refresh);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", refresh);
            window.removeEventListener("focus", refresh);
        };
    }, [router]);

    return (
        <section className="mt-8" aria-labelledby="today-plan-practice-title">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2
                        id="today-plan-practice-title"
                        className="text-xl font-semibold"
                    >
                        {t("plans.title")}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                        {t("plans.description")}
                    </p>
                </div>
                <nav
                    aria-label={plans("navigation")}
                    className="flex flex-wrap gap-2"
                >
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-11 rounded-xl"
                    >
                        <Link href="/memorization/plan">
                            {plans("memorization")}
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="min-h-11 rounded-xl"
                    >
                        <Link href="/memorization/revision">
                            {plans("revision")}
                        </Link>
                    </Button>
                </nav>
            </div>
            {sessions.length === 0 ? (
                <p className="app-card mt-4 p-5 text-sm leading-7 text-muted-foreground">
                    {t("plans.empty")}
                </p>
            ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {sessions.map((session) => {
                        const Icon =
                            session.kind === "memorization"
                                ? BookMarked
                                : RefreshCcw;
                        return (
                            <section
                                key={`${session.kind}:${session.id}`}
                                className="app-card flex flex-col p-4 sm:p-5"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                                        <Icon
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        {t(`kinds.${session.kind}`)}
                                    </div>
                                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                        {t("plans.today")}
                                    </span>
                                </div>
                                <h3 className="mt-3 text-base font-semibold leading-7 sm:text-lg">
                                    {range(session)}
                                </h3>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {t("riwayah", {
                                        riwayah: t(
                                            `riwayahs.${session.riwayah}`,
                                        ),
                                    })}
                                </p>
                                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                    <span>{date(session.scheduledDate)}</span>
                                    <bdi>{session.timezone}</bdi>
                                </p>
                                {session.credited > 0 && (
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        {t(
                                            session.kind === "memorization"
                                                ? "plans.memorized"
                                                : "plans.peerCredit",
                                            {
                                                count: session.credited,
                                                total: session.total,
                                            },
                                        )}
                                    </p>
                                )}
                                <div className="mt-auto pt-6">
                                    <Button
                                        asChild
                                        className="min-h-11 w-full rounded-xl sm:w-auto"
                                    >
                                        <Link
                                            href={`/practice/${session.kind}/${session.id}/read`}
                                        >
                                            {t(
                                                session.started
                                                    ? "continue"
                                                    : "start",
                                            )}
                                            <ArrowRight
                                                aria-hidden="true"
                                                className={cn(
                                                    "size-4",
                                                    locale === "ar" &&
                                                        "rotate-180",
                                                )}
                                            />
                                        </Link>
                                    </Button>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
