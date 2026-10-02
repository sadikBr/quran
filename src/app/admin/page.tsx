import { and, desc, eq, sql } from "drizzle-orm";
import {
    ArrowUpRight,
    BookOpenCheck,
    CheckCircle2,
    ChevronDown,
    History,
    KeyRound,
    Plus,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { createTranslator } from "next-intl";
import SectionHeading from "@/components/section-heading";
import { Button } from "@/components/ui/button";
import db from "@/drizzle/db";
import {
    adminActivity,
    groupMember,
    memorizationCorrectionRequest,
    memorizationGroup,
    user,
} from "@/drizzle/schema";
import AdminWorkspace from "@/features/admin/components/admin-workspace";
import CircleActivationControl from "@/features/admin/components/circle-activation-control";
import {
    CircleControls,
    CreateCircleForm,
} from "@/features/admin/components/circle-management";
import { requirePlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";
import { cn } from "@/lib/utils";

function pageNumber(value?: string) {
    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0
        ? Math.min(number, 10000)
        : 1;
}

export default async function AdminPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string; activity?: string }>;
}) {
    await requirePlatformAdmin();
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Admin",
    });
    const params = await searchParams;
    const page = pageNumber(params.page);
    const activityPage = pageNumber(params.activity);
    const circles = await db
        .select({
            id: memorizationGroup.id,
            isActive: memorizationGroup.isActive,
            name: memorizationGroup.name,
            description: memorizationGroup.description,
            inviteCode: memorizationGroup.inviteCode,
            supervisor: user.name,
            supervisorEmail: user.email,
            members: sql<number>`(select count(*)::int from group_member as members where members.group_id = ${memorizationGroup.id})`,
        })
        .from(memorizationGroup)
        .leftJoin(
            groupMember,
            and(
                eq(groupMember.groupId, memorizationGroup.id),
                eq(groupMember.role, "supervisor"),
            ),
        )
        .leftJoin(user, eq(user.id, groupMember.userId))
        .orderBy(desc(memorizationGroup.createdAt), memorizationGroup.id)
        .limit(21)
        .offset((page - 1) * 20);
    const activity = await db
        .select()
        .from(adminActivity)
        .orderBy(desc(adminActivity.createdAt), adminActivity.id)
        .limit(21)
        .offset((activityPage - 1) * 20);
    const [{ count: correctionCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(memorizationCorrectionRequest)
        .where(eq(memorizationCorrectionRequest.status, "pending"));
    const [circleSummary] = await db
        .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${memorizationGroup.isActive})::int`,
        })
        .from(memorizationGroup);
    const memoryT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Memorization.admin",
    });
    const singleCircleLayout = circles.length === 1;
    return (
        <AdminWorkspace
            language={preferences.language}
            title={t("title")}
            description={t("description")}
        >
            <section
                aria-label={t("overview")}
                className="grid gap-3 sm:grid-cols-3"
            >
                <article className="admin-stat-card group">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                            {t("totalCircles")}
                        </span>
                        <span className="admin-stat-icon">
                            <UsersRound aria-hidden="true" className="size-4" />
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                        {Number(circleSummary?.total ?? 0)}
                    </p>
                </article>
                <article className="admin-stat-card group">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                            {t("activeCircles")}
                        </span>
                        <span className="admin-stat-icon admin-stat-icon-active">
                            <CheckCircle2
                                aria-hidden="true"
                                className="size-4"
                            />
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                        {Number(circleSummary?.active ?? 0)}
                    </p>
                </article>
                <article className="admin-stat-card group">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-muted-foreground">
                            {t("pendingReviews")}
                        </span>
                        <span className="admin-stat-icon admin-stat-icon-review">
                            <BookOpenCheck
                                aria-hidden="true"
                                className="size-4"
                            />
                        </span>
                    </div>
                    <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
                        {Number(correctionCount)}
                    </p>
                </article>
            </section>
            <Link
                href="/admin/memorization"
                className="admin-feature-card app-card group flex min-w-0 items-center gap-3 p-4 outline-none transition-[border-color,background-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring sm:gap-4 sm:p-5"
            >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <BookOpenCheck aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                        {memoryT("title")}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {memoryT("description")}
                    </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm text-primary">
                        {memoryT("count", { count: correctionCount })}
                    </span>
                    <ArrowUpRight
                        aria-hidden="true"
                        className="hidden size-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:block rtl:rotate-[-90deg]"
                    />
                </span>
            </Link>
            <details
                className="admin-create-card group/create app-card overflow-hidden"
                open={circles.length === 0 && page === 1}
            >
                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Plus aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block font-semibold">
                            {t("create")}
                        </span>
                        <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">
                            {t("createHint")}
                        </span>
                    </span>
                    <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open/create:rotate-180"
                    />
                </summary>
                <div className="border-t border-border/60 p-4 sm:p-6">
                    <CreateCircleForm />
                </div>
            </details>
            <section aria-labelledby="circles-title" className="space-y-4">
                <div
                    className={cn(
                        "admin-circles-section space-y-4",
                        singleCircleLayout && "lg:mx-auto lg:max-w-3xl",
                    )}
                >
                    <SectionHeading
                        id="circles-title"
                        title={t("circles")}
                        description={t("circleListHint")}
                        icon={<UsersRound />}
                        actions={
                            <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                {Number(circleSummary?.total ?? 0)}
                            </span>
                        }
                    />
                    {!circles.length && (
                        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-primary/20 bg-card/40 px-6 py-12 text-center">
                            <UsersRound
                                aria-hidden="true"
                                className="size-8 stroke-[1.3] text-primary/70"
                            />
                            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                                {t("empty")}
                            </p>
                        </div>
                    )}
                    <div
                        className={cn(
                            "grid min-w-0 gap-4 lg:gap-5",
                            circles.length > 1 && "lg:grid-cols-2",
                        )}
                    >
                        {circles.slice(0, 20).map((circle) => (
                            <article
                                key={circle.id}
                                className="admin-circle-card app-card flex min-w-0 flex-col overflow-hidden"
                            >
                                <div className="flex items-start gap-3 p-4 sm:p-5">
                                    <span
                                        aria-hidden="true"
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                    >
                                        <UsersRound className="size-5 stroke-[1.6]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="break-words text-base font-semibold leading-7">
                                                {circle.name}
                                            </h3>
                                            <span
                                                className={cn(
                                                    "admin-status-chip",
                                                    circle.isActive &&
                                                        "admin-status-chip-active",
                                                )}
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className="size-1.5 rounded-full bg-current"
                                                />
                                                {t(
                                                    circle.isActive
                                                        ? "active"
                                                        : "inactive",
                                                )}
                                            </span>
                                        </div>
                                        <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">
                                            {circle.description ||
                                                t("noDescription")}
                                        </p>
                                    </div>
                                    <span
                                        className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground"
                                        title={t("members")}
                                    >
                                        <UsersRound
                                            aria-hidden="true"
                                            className="size-3.5"
                                        />
                                        <span>{Number(circle.members)}</span>
                                        <span className="sr-only">
                                            {t("members")}
                                        </span>
                                    </span>
                                </div>
                                <dl className="admin-circle-meta mx-4 mb-4 grid gap-px overflow-hidden rounded-xl border border-border/50 bg-border/50 text-sm sm:mx-5 sm:mb-5 sm:grid-cols-2">
                                    <div className="bg-card/80 p-3">
                                        <dt className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                            <UserRound
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            {t("supervisor")}
                                        </dt>
                                        <dd className="break-words font-medium">
                                            {circle.supervisor ??
                                                t("unassigned")}
                                            <bdi className="mt-1 block break-all text-xs text-muted-foreground">
                                                {circle.supervisorEmail}
                                            </bdi>
                                        </dd>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-3 bg-card/80 p-3">
                                        <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <KeyRound
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            {t("invite")}
                                        </dt>
                                        <dd className="max-w-full break-all rounded-lg bg-primary/10 px-3 py-1.5 font-mono text-sm tracking-widest text-primary">
                                            <bdi>{circle.inviteCode}</bdi>
                                        </dd>
                                    </div>
                                </dl>
                                <CircleActivationControl
                                    groupId={circle.id}
                                    name={circle.name}
                                    isActive={circle.isActive}
                                    hasSupervisor={Boolean(circle.supervisor)}
                                />
                                <div className="admin-circle-footer border-t border-border/60 bg-muted/20 p-3 sm:px-4">
                                    <CircleControls
                                        groupId={circle.id}
                                        name={circle.name}
                                        description={circle.description}
                                        hasSupervisor={Boolean(
                                            circle.supervisor,
                                        )}
                                    />
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-2 empty:hidden">
                        {page > 1 && (
                            <Button asChild variant="outline">
                                <Link
                                    href={`/admin?page=${page - 1}&activity=${activityPage}`}
                                >
                                    {t("previousCircles")}
                                </Link>
                            </Button>
                        )}
                        {circles.length > 20 && (
                            <Button asChild variant="outline">
                                <Link
                                    href={`/admin?page=${page + 1}&activity=${activityPage}`}
                                >
                                    {t("nextCircles")}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </section>
            <details
                open={activityPage > 1}
                className="group/history app-card overflow-hidden"
                aria-labelledby="activity-title"
            >
                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <History aria-hidden="true" className="size-5" />
                    </span>
                    <h2
                        id="activity-title"
                        className="min-w-0 flex-1 font-semibold"
                    >
                        {t("history")}
                    </h2>
                    <ChevronDown
                        aria-hidden="true"
                        className="size-4 text-muted-foreground transition-transform group-open/history:rotate-180"
                    />
                </summary>
                <div className="border-t border-border/60 bg-muted/20 px-4 pb-4 sm:px-5 sm:pb-5">
                    {!activity.length && (
                        <p className="mt-4 text-sm text-muted-foreground">
                            {t("noHistory")}
                        </p>
                    )}
                    <ul className="divide-y divide-border/50">
                        {activity.slice(0, 20).map((event) => (
                            <li
                                key={event.id}
                                className="flex items-start gap-3 py-4 text-sm"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                >
                                    <ArrowUpRight className="size-3.5 rtl:-rotate-90" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium">
                                        {t(event.action)}
                                    </p>
                                    <p className="mt-1 break-words text-xs text-muted-foreground">
                                        {event.groupName}
                                    </p>
                                    <time
                                        dateTime={event.createdAt.toISOString()}
                                        className="mt-2 block text-xs text-muted-foreground"
                                    >
                                        {new Intl.DateTimeFormat(
                                            preferences.language,
                                            {
                                                dateStyle: "medium",
                                                timeStyle: "short",
                                                timeZone: "UTC",
                                            },
                                        ).format(event.createdAt)}{" "}
                                        UTC
                                    </time>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap gap-2 empty:hidden">
                        {activityPage > 1 && (
                            <Button asChild variant="outline">
                                <Link
                                    href={`/admin?page=${page}&activity=${activityPage - 1}`}
                                >
                                    {t("previous")}
                                </Link>
                            </Button>
                        )}
                        {activity.length > 20 && (
                            <Button asChild variant="outline">
                                <Link
                                    href={`/admin?page=${page}&activity=${activityPage + 1}`}
                                >
                                    {t("loadMore")}
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </details>
        </AdminWorkspace>
    );
}
