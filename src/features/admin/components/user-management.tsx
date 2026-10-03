"use client";

import {
    ArrowLeft,
    ArrowUpRight,
    BookOpen,
    ChevronDown,
    ChevronRight,
    History,
    Search,
    ShieldCheck,
    ShieldOff,
    UserRound,
    UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
    getManagedUser,
    getUserActivity,
    listManagedUsers,
    UserFilter,
} from "../server/user-service";
import UserControls, { UserDataCounts } from "./user-controls";

function AccountDate({ date, time = false }: { date: Date; time?: boolean }) {
    const locale = useLocale();
    return (
        <time dateTime={date.toISOString()}>
            {new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                ...(time ? { timeStyle: "short" as const } : {}),
                timeZone: "Africa/Casablanca",
            }).format(date)}
        </time>
    );
}
function Status({ suspended }: { suspended: boolean }) {
    const t = useTranslations("Admin.users");
    return (
        <span
            className={`admin-status-chip ${suspended ? "bg-destructive/10 text-destructive" : "admin-status-chip-active"}`}
        >
            <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-current"
            />
            {t(suspended ? "suspended" : "active")}
        </span>
    );
}
export function UsersBackLink({ detail = false }: { detail?: boolean }) {
    const t = useTranslations("Admin.users");
    return (
        <Button asChild variant="ghost" className="-ms-3">
            <Link href={detail ? "/admin/users" : "/admin"}>
                <ArrowLeft
                    aria-hidden="true"
                    className="size-4 rtl:rotate-180"
                />
                {t(detail ? "backUsers" : "back")}
            </Link>
        </Button>
    );
}
export function UserPagination({
    page,
    hasMore,
    href,
}: {
    page: number;
    hasMore: boolean;
    href: string;
}) {
    const t = useTranslations("Admin.users");
    if (page === 1 && !hasMore) return null;
    return (
        <nav
            aria-label={t("page", { page })}
            className="flex flex-wrap items-center justify-between gap-3 pt-4"
        >
            <p className="text-sm text-muted-foreground">
                {t("page", { page })}
            </p>
            <div className="flex flex-wrap gap-2">
                {page > 1 && (
                    <Button asChild variant="outline" className="min-h-11">
                        <Link href={`${href}${page - 1}`}>{t("previous")}</Link>
                    </Button>
                )}
                {hasMore && (
                    <Button asChild variant="outline" className="min-h-11">
                        <Link href={`${href}${page + 1}`}>{t("next")}</Link>
                    </Button>
                )}
            </div>
        </nav>
    );
}
export function UserDirectory({
    data,
    query,
    filter,
    page,
}: {
    data: Awaited<ReturnType<typeof listManagedUsers>>;
    query: string;
    filter: UserFilter;
    page: number;
}) {
    const t = useTranslations("Admin.users");
    return (
        <>
            <UsersBackLink />
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    {
                        label: "total",
                        count: data.summary.total,
                        icon: UsersRound,
                    },
                    {
                        label: "supervisorsTotal",
                        count: data.summary.supervisors,
                        icon: ShieldCheck,
                    },
                    {
                        label: "suspendedTotal",
                        count: data.summary.suspended,
                        icon: ShieldOff,
                    },
                ].map(({ label, count, icon: Icon }) => (
                    <article className="admin-stat-card" key={label}>
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-sm text-muted-foreground">
                                {t(label)}
                            </span>
                            <span className="admin-stat-icon">
                                <Icon aria-hidden="true" className="size-4" />
                            </span>
                        </div>
                        <p className="mt-3 text-2xl font-semibold tabular-nums">
                            {count}
                        </p>
                    </article>
                ))}
            </div>
            <section className="app-card overflow-hidden">
                <form
                    action="/admin/users"
                    className="grid gap-3 border-b border-border/60 bg-muted/20 p-4 sm:grid-cols-[1fr_12rem_auto] sm:p-5"
                >
                    <div className="relative">
                        <label htmlFor="user-search" className="sr-only">
                            {t("search")}
                        </label>
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute start-3 top-3.5 size-4 text-muted-foreground"
                        />
                        <Input
                            id="user-search"
                            name="q"
                            defaultValue={query}
                            placeholder={t("search")}
                            maxLength={100}
                            className="h-11 bg-background/80 ps-10 text-start"
                            dir="auto"
                        />
                    </div>
                    <div>
                        <label htmlFor="user-filter" className="sr-only">
                            {t("filter")}
                        </label>
                        <select
                            id="user-filter"
                            name="filter"
                            defaultValue={filter}
                            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {(
                                [
                                    "all",
                                    "active",
                                    "suspended",
                                    "supervisors",
                                ] as const
                            ).map((key) => (
                                <option key={key} value={key}>
                                    {t(key)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button type="submit" className="min-h-11">
                        <Search aria-hidden="true" className="size-4" />
                        {t("searchButton")}
                    </Button>
                </form>
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                    <p className="text-sm text-muted-foreground">
                        {t("results", { count: data.count })}
                    </p>
                    {(query || filter !== "all") && (
                        <Link
                            href="/admin/users"
                            className="rounded-md px-2 py-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {t("clear")}
                        </Link>
                    )}
                </div>
                {!data.users.length ? (
                    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
                        <UsersRound
                            aria-hidden="true"
                            className="size-9 stroke-[1.3] text-primary/70"
                        />
                        <p className="max-w-md text-sm leading-7 text-muted-foreground">
                            {t(data.summary.total ? "empty" : "emptyInitial")}
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border/50 border-t border-border/50">
                        {data.users.map((account) => (
                            <li key={account.id}>
                                <Link
                                    href={`/admin/users/${encodeURIComponent(account.id)}`}
                                    className="group grid items-center gap-4 p-4 outline-none transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                            <UserRound
                                                aria-hidden="true"
                                                className="size-5"
                                            />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="break-words font-semibold leading-7">
                                                {account.name}
                                            </p>
                                            <bdi className="block break-all text-left text-sm rtl:text-right leading-6 text-muted-foreground">
                                                {account.email}
                                            </bdi>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Status
                                            suspended={!!account.suspendedAt}
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            {t(
                                                account.supervises
                                                    ? "supervisor"
                                                    : "member",
                                            )}{" "}
                                            ·{" "}
                                            {t("circleCount", {
                                                count: account.circles,
                                            })}
                                        </span>
                                    </div>
                                    <div className="text-xs leading-6 text-muted-foreground">
                                        <span className="me-2">
                                            {t("joined")}
                                        </span>
                                        <AccountDate date={account.createdAt} />
                                    </div>
                                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                                        <span className="lg:sr-only">
                                            {t("details")}
                                        </span>
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="size-4 rtl:rotate-180"
                                        />
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <UserPagination
                page={page}
                hasMore={data.hasMore}
                href={`/admin/users?q=${encodeURIComponent(query)}&filter=${filter}&page=`}
            />
        </>
    );
}

export function UserDetails({
    data,
}: {
    data: NonNullable<Awaited<ReturnType<typeof getManagedUser>>>;
}) {
    const t = useTranslations("Admin.users");
    const { account, circles, summary } = data;
    return (
        <>
            <UsersBackLink detail />
            <section className="admin-feature-card app-card flex flex-wrap items-center gap-4 p-4 sm:p-6">
                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserRound aria-hidden="true" className="size-7" />
                </span>
                <div className="min-w-0 flex-1 basis-48">
                    <h2 className="break-words text-xl font-semibold leading-8">
                        {account.name}
                    </h2>
                    <bdi className="mt-1 block break-all text-left text-sm rtl:text-right text-muted-foreground">
                        {account.email}
                    </bdi>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {t("joined")} · <AccountDate date={account.createdAt} />
                    </p>
                </div>
                <Status suspended={!!account.suspendedAt} />
            </section>
            <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="min-w-0 lg:col-start-2 lg:row-start-1">
                    <UserControls
                        account={account}
                        supervises={circles.some(
                            (circle) => circle.role === "supervisor",
                        )}
                    />
                </div>
                <div className="min-w-0 space-y-5 lg:col-start-1 lg:row-start-1">
                    <section className="app-card p-4 sm:p-5">
                        <h2 className="flex items-center gap-2 font-semibold">
                            <BookOpen
                                aria-hidden="true"
                                className="size-5 text-primary"
                            />
                            {t("dataTitle")}
                        </h2>
                        <p className="mb-2 mt-2 text-sm leading-6 text-muted-foreground">
                            {t("dataHint")}
                        </p>
                        <UserDataCounts summary={summary} />
                    </section>
                    <section id="user-circles" className="app-card p-4 sm:p-5">
                        <h2 className="mb-4 flex items-center gap-2 font-semibold">
                            <UsersRound
                                aria-hidden="true"
                                className="size-5 text-primary"
                            />
                            {t("circles")}
                            <span className="ms-auto rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                                {circles.length}
                            </span>
                        </h2>
                        {!circles.length ? (
                            <p className="py-4 text-sm leading-6 text-muted-foreground">
                                {t("noCircles")}
                            </p>
                        ) : (
                            <ul className="divide-y divide-border/50">
                                {circles.map((circle) => (
                                    <li key={circle.id}>
                                        <Link
                                            href={`/admin?page=${circle.adminPage}#circle-${encodeURIComponent(circle.id)}`}
                                            className="flex items-start gap-3 rounded-lg py-4 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="break-words font-medium">
                                                    {circle.name}
                                                </p>
                                                <p className="mt-1 text-xs leading-6 text-muted-foreground">
                                                    {t(
                                                        circle.role ===
                                                            "supervisor"
                                                            ? "supervisor"
                                                            : "member",
                                                    )}{" "}
                                                    ·{" "}
                                                    {t(
                                                        circle.isActive
                                                            ? "circleActive"
                                                            : "circleInactive",
                                                    )}
                                                </p>
                                            </div>
                                            <span className="sr-only">
                                                {t("manageCircle")}
                                            </span>
                                            <ArrowUpRight
                                                aria-hidden="true"
                                                className="mt-1 size-4 shrink-0 rtl:-rotate-90"
                                            />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

export function UserActivity({
    events,
    page,
    href,
}: {
    events: Awaited<ReturnType<typeof getUserActivity>>;
    page: number;
    href: string;
}) {
    const t = useTranslations("Admin.users");
    return (
        <details
            className="group/history app-card overflow-hidden"
            open={page > 1}
        >
            <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 p-4 outline-none hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-5 [&::-webkit-details-marker]:hidden">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <History aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t("history")}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {t("historyHint")}
                    </span>
                </span>
                <ChevronDown
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-open/history:rotate-180"
                />
            </summary>
            <div className="border-t border-border/60 bg-muted/20 p-4 sm:p-5">
                {!events.length ? (
                    <p className="text-sm text-muted-foreground">
                        {t("noHistory")}
                    </p>
                ) : (
                    <>
                        <p className="mb-2 text-xs text-muted-foreground">
                            {t("timeZone")}
                        </p>
                        <ul className="divide-y divide-border/50">
                            {events.slice(0, 20).map((event) => (
                                <li
                                    key={event.id}
                                    className="space-y-2 py-4 text-sm"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="font-medium">
                                            {t(`events.${event.action}`)}
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                            <AccountDate
                                                date={event.createdAt}
                                                time
                                            />
                                        </span>
                                    </div>
                                    {event.targetId ? (
                                        <Link
                                            href={`/admin/users/${encodeURIComponent(event.targetId)}`}
                                            className="block break-words text-primary hover:underline"
                                        >
                                            {event.targetName}
                                        </Link>
                                    ) : (
                                        <p>
                                            {event.targetName} ·{" "}
                                            {t("deletedUser")}
                                        </p>
                                    )}
                                    <p className="whitespace-pre-wrap break-words leading-6 text-muted-foreground">
                                        {event.reason}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t("by", { name: event.actorName })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <UserPagination
                    page={page}
                    hasMore={events.length > 20}
                    href={href}
                />
            </div>
        </details>
    );
}
