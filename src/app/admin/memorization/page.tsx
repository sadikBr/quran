import { asc, desc, eq, sql } from "drizzle-orm";
import { BookOpen, BookOpenCheck, CheckCircle2, History } from "lucide-react";
import Link from "next/link";
import { createTranslator } from "next-intl";
import { Button } from "@/components/ui/button";
import db from "@/drizzle/db";
import {
    memorizationBaselineChange,
    memorizationCorrectionRequest,
    user,
} from "@/drizzle/schema";
import AdminWorkspace from "@/features/admin/components/admin-workspace";
import MemorizationCorrectionReview from "@/features/admin/components/memorization-correction-review";
import { requirePlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

function HizbBadges({ hizbs, empty }: { hizbs: number[]; empty: string }) {
    if (!hizbs.length) {
        return <p className="mt-3 text-sm text-muted-foreground">{empty}</p>;
    }
    return (
        <div dir="ltr" className="mt-3 flex flex-wrap gap-1.5">
            {hizbs.map((hizb) => (
                <span
                    key={hizb}
                    className="inline-flex min-w-9 items-center justify-center rounded-lg bg-background/75 px-2.5 py-1.5 font-mono text-sm font-medium text-foreground ring-1 ring-border/60"
                >
                    {hizb}
                </span>
            ))}
        </div>
    );
}

export default async function MemorizationRequestsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    await requirePlatformAdmin();
    const preferences = await getPreferences();
    const t = createTranslator({
        locale: preferences.language,
        messages: await getMessages(preferences.language),
        namespace: "Memorization.admin",
    });
    const value = Number((await searchParams).page);
    const page =
        Number.isSafeInteger(value) && value > 0 ? Math.min(value, 10000) : 1;
    const requests = await db
        .select({
            request: memorizationCorrectionRequest,
            name: user.name,
            changes: sql<
                { previousHizbs: number[]; hizbs: number[] }[]
            >`coalesce((select json_agg(json_build_object('previousHizbs', previous_hizbs, 'hizbs', hizbs)) from ${memorizationBaselineChange} where request_id = ${memorizationCorrectionRequest.id}), '[]'::json)`,
        })
        .from(memorizationCorrectionRequest)
        .innerJoin(user, eq(user.id, memorizationCorrectionRequest.userId))
        .orderBy(
            sql`case when ${memorizationCorrectionRequest.status} = 'pending' then 0 else 1 end`,
            desc(memorizationCorrectionRequest.createdAt),
            asc(memorizationCorrectionRequest.id),
        )
        .limit(21)
        .offset((page - 1) * 20);
    return (
        <AdminWorkspace
            language={preferences.language}
            title={t("title")}
            description={t("description")}
        >
            {!requests.length && (
                <div className="app-card flex items-center gap-3 p-5 sm:p-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <BookOpenCheck aria-hidden="true" className="size-5" />
                    </span>
                    <p className="text-sm leading-6 text-muted-foreground">
                        {t("empty")}
                    </p>
                </div>
            )}
            {requests.length > 0 && (
                <div className="space-y-4">
                    {requests.slice(0, 20).map(({ request, name, changes }) => (
                        <article
                            key={request.id}
                            className="app-card overflow-hidden"
                        >
                            <header className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <BookOpenCheck
                                        aria-hidden="true"
                                        className="size-5"
                                    />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h2 className="break-words font-semibold">
                                        <bdi>{name}</bdi>
                                    </h2>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {request.createdAt.toLocaleString(
                                            preferences.language,
                                            { timeZone: "UTC" },
                                        )}{" "}
                                        UTC
                                    </p>
                                </div>
                                <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs text-primary">
                                    {t(request.status)}
                                </span>
                            </header>

                            <div className="border-t border-border/50 bg-muted/15 px-4 py-4 sm:px-5 sm:py-5">
                                <p className="whitespace-pre-line text-sm leading-7">
                                    {request.reason}
                                </p>
                                {request.reviewNote && (
                                    <p className="mt-4 rounded-xl border border-border/50 bg-background/45 p-3 text-sm leading-7 text-muted-foreground">
                                        {request.reviewNote}
                                    </p>
                                )}
                            </div>

                            {changes.length > 0 && (
                                <section className="border-t border-border/50 bg-background/20 px-4 py-4 sm:px-5 sm:py-5">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                        <History
                                            aria-hidden="true"
                                            className="size-4 text-primary"
                                        />
                                        <h3>{t("changeHistory")}</h3>
                                    </div>
                                    <div className="mt-3 space-y-3">
                                        {changes.map((change) => (
                                            <div
                                                key={JSON.stringify(change)}
                                                className="grid gap-3 sm:grid-cols-2"
                                            >
                                                <div className="rounded-xl border border-border/50 bg-card/60 p-3">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                                        <BookOpen
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                        {t("previousHizbs")}
                                                    </div>
                                                    <HizbBadges
                                                        hizbs={
                                                            change.previousHizbs
                                                        }
                                                        empty={t("none")}
                                                    />
                                                </div>
                                                <div className="rounded-xl border border-primary/20 bg-primary/[0.06] p-3">
                                                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                                                        <CheckCircle2
                                                            aria-hidden="true"
                                                            className="size-3.5"
                                                        />
                                                        {t("correctedHizbs")}
                                                    </div>
                                                    <HizbBadges
                                                        hizbs={change.hizbs}
                                                        empty={t("none")}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {request.status === "pending" && (
                                <div className="border-t border-border/50 bg-muted/20 px-4 py-4 sm:px-5 sm:py-5">
                                    <MemorizationCorrectionReview
                                        requestId={request.id}
                                    />
                                </div>
                            )}
                        </article>
                    ))}
                </div>
            )}
            <div className="flex gap-3">
                {page > 1 && (
                    <Button asChild variant="outline">
                        <Link href={`/admin/memorization?page=${page - 1}`}>
                            {t("previous")}
                        </Link>
                    </Button>
                )}
                {requests.length > 20 && (
                    <Button asChild variant="outline">
                        <Link href={`/admin/memorization?page=${page + 1}`}>
                            {t("next")}
                        </Link>
                    </Button>
                )}
            </div>
        </AdminWorkspace>
    );
}
