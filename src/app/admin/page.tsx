import { and, desc, eq, sql } from "drizzle-orm";
import {
    ArrowUpRight,
    ChevronDown,
    History,
    KeyRound,
    Plus,
    ShieldCheck,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { createTranslator } from "next-intl";
import PageBackground from "@/components/page-background";
import StickyAppHeader from "@/components/sticky-app-header";
import { Button } from "@/components/ui/button";
import UserMenu from "@/components/user-menu";
import db from "@/drizzle/db";
import {
    adminActivity,
    groupMember,
    memorizationGroup,
    user,
} from "@/drizzle/schema";
import {
    CircleControls,
    CreateCircleForm,
} from "@/features/admin/components/circle-management";
import { requirePlatformAdmin } from "@/features/auth/permissions";
import getPreferences from "@/features/settings/server/get-preferences";
import { getMessages } from "@/i18n/config";

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
    const admin = await requirePlatformAdmin();
    const preferences = await getPreferences();
    const messages = await getMessages(preferences.language);
    const t = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Admin",
    });
    const homeT = createTranslator({
        locale: preferences.language,
        messages,
        namespace: "Home.account",
    });
    const params = await searchParams;
    const page = pageNumber(params.page);
    const activityPage = pageNumber(params.activity);
    const circles = await db
        .select({
            id: memorizationGroup.id,
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
    const labels = {
        openMenu: homeT("openMenu"),
        readingSpace: t("account"),
        switchToLight: homeT("switchToLight"),
        switchToDark: homeT("switchToDark"),
        continueReading: homeT("continueReading"),
        dashboard: t("title"),
        profile: homeT("profile"),
        settings: homeT("settings"),
        signOut: homeT("signOut"),
    };
    return (
        <main className="relative isolate min-h-dvh overflow-x-clip bg-background">
            <PageBackground />
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <StickyAppHeader navigation>
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 text-sm font-semibold"
                    >
                        <ShieldCheck className="size-5 text-primary" />
                        {t("account")}
                    </Link>
                    <UserMenu
                        name={admin.name}
                        image={admin.image}
                        labels={labels}
                    />
                </StickyAppHeader>
                <div className="space-y-8 pb-14 pt-8 sm:space-y-10 sm:pt-12">
                    <header className="relative flex items-start justify-between gap-6 border-b border-border/60 pb-8 sm:pb-10">
                        <div className="min-w-0">
                            <p className="mb-3 text-xs font-semibold tracking-wide text-primary">
                                {t("account")}
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                {t("title")}
                            </h1>
                            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                                {t("description")}
                            </p>
                        </div>
                        <span
                            aria-hidden="true"
                            className="hidden size-20 shrink-0 items-center justify-center rounded-3xl border border-primary/15 bg-primary/[0.06] text-primary sm:flex"
                        >
                            <ShieldCheck className="size-8 stroke-[1.4]" />
                        </span>
                    </header>
                    <details
                        className="group/create overflow-hidden rounded-2xl border border-primary/20 bg-card/75 shadow-sm"
                        open={circles.length === 0 && page === 1}
                    >
                        <summary className="flex min-h-24 cursor-pointer list-none items-center gap-4 p-5 outline-none transition-colors hover:bg-primary/[0.035] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
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
                        <div className="border-t border-border/60 px-5 pb-6 sm:px-6">
                            <CreateCircleForm />
                        </div>
                    </details>
                    <section
                        aria-labelledby="circles-title"
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2
                                id="circles-title"
                                className="text-xl font-semibold"
                            >
                                {t("circles")}
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                {t("circleListHint")}
                            </p>
                        </div>
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
                        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,26rem),1fr))] items-start gap-4 lg:gap-5">
                            {circles.slice(0, 20).map((circle) => (
                                <article
                                    key={circle.id}
                                    className="min-w-0 overflow-hidden rounded-2xl border border-border/65 bg-card/80 shadow-sm transition-shadow hover:shadow-md"
                                >
                                    <div className="flex items-start gap-3 p-5 pb-4 sm:p-6 sm:pb-5">
                                        <span
                                            aria-hidden="true"
                                            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                                        >
                                            <UsersRound className="size-5 stroke-[1.6]" />
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="break-words text-lg font-semibold">
                                                {circle.name}
                                            </h3>
                                            <p className="mt-1 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
                                                {circle.description}
                                            </p>
                                        </div>
                                        <span
                                            className="ms-auto flex shrink-0 items-center gap-1.5 rounded-lg border border-border/60 px-2 py-1.5 text-xs text-muted-foreground"
                                            title={t("members")}
                                        >
                                            <UsersRound
                                                aria-hidden="true"
                                                className="size-3.5"
                                            />
                                            <span>
                                                {Number(circle.members)}
                                            </span>
                                            <span className="sr-only">
                                                {t("members")}
                                            </span>
                                        </span>
                                    </div>
                                    <dl className="mx-5 mb-5 divide-y divide-border/50 rounded-xl bg-muted/35 px-4 text-sm sm:mx-6 sm:mb-6">
                                        <div className="py-4">
                                            <dt className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                <UserRound
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                {t("supervisor")}
                                            </dt>
                                            <dd className="min-h-11 font-medium">
                                                {circle.supervisor ??
                                                    t("unassigned")}
                                                <bdi className="mt-1 block break-all text-xs text-muted-foreground">
                                                    {circle.supervisorEmail}
                                                </bdi>
                                            </dd>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                                            <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <KeyRound
                                                    aria-hidden="true"
                                                    className="size-3.5"
                                                />
                                                {t("invite")}
                                            </dt>
                                            <dd className="rounded-md border border-border/50 bg-background/70 px-2.5 py-1.5 font-mono text-xs tracking-widest text-primary">
                                                <bdi>{circle.inviteCode}</bdi>
                                            </dd>
                                        </div>
                                    </dl>
                                    <div className="border-t border-border/55 bg-muted/15 p-3 sm:px-4">
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
                        <div className="flex gap-2">
                            {page > 1 && (
                                <Button asChild variant="outline">
                                    <Link
                                        href={`/admin?page=${page - 1}&activity=${activityPage}`}
                                    >
                                        {t("previous")}
                                    </Link>
                                </Button>
                            )}
                            {circles.length > 20 && (
                                <Button asChild variant="outline">
                                    <Link
                                        href={`/admin?page=${page + 1}&activity=${activityPage}`}
                                    >
                                        {t("loadMore")}
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </section>
                    <details
                        open={activityPage > 1}
                        className="group/history rounded-2xl border border-border/60 bg-card/40"
                        aria-labelledby="activity-title"
                    >
                        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 outline-none hover:bg-muted/20 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6 [&::-webkit-details-marker]:hidden">
                            <History
                                aria-hidden="true"
                                className="size-5 text-muted-foreground"
                            />
                            <h2
                                id="activity-title"
                                className="flex-1 text-sm font-semibold"
                            >
                                {t("history")}
                            </h2>
                            <ChevronDown
                                aria-hidden="true"
                                className="size-4 text-muted-foreground transition-transform group-open/history:rotate-180"
                            />
                        </summary>
                        <div className="border-t border-border/50 px-5 pb-5 sm:px-6">
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
                                            className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] text-primary"
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
                            <div className="mt-4 flex gap-2">
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
                </div>
            </div>
        </main>
    );
}
