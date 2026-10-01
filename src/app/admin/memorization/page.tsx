import { asc, desc, eq, sql } from "drizzle-orm";
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
            <Button asChild variant="outline">
                <Link href="/admin">{t("back")}</Link>
            </Button>
            {!requests.length && (
                <p className="app-card p-6 text-muted-foreground">
                    {t("empty")}
                </p>
            )}
            {requests.slice(0, 20).map(({ request, name, changes }) => (
                <article key={request.id} className="app-card space-y-3 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="font-semibold">
                            <bdi>{name}</bdi>
                        </h2>
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                            {t(request.status)}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {request.createdAt.toLocaleString(
                            preferences.language,
                            { timeZone: "UTC" },
                        )}{" "}
                        UTC
                    </p>
                    <p className="whitespace-pre-line text-sm leading-7">
                        {request.reason}
                    </p>
                    {request.reviewNote && (
                        <p className="rounded-xl bg-muted/40 p-3 text-sm leading-7">
                            {request.reviewNote}
                        </p>
                    )}
                    {request.status === "pending" && (
                        <MemorizationCorrectionReview requestId={request.id} />
                    )}
                    {changes.map((change) => (
                        <div
                            key={JSON.stringify(change)}
                            className="border-t border-border/50 pt-3 text-sm leading-7"
                        >
                            <p>
                                {t("before", {
                                    hizbs:
                                        change.previousHizbs.join("، ") ||
                                        t("none"),
                                })}
                            </p>
                            <p>
                                {t("after", {
                                    hizbs: change.hizbs.join("، ") || t("none"),
                                })}
                            </p>
                        </div>
                    ))}
                </article>
            ))}
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
