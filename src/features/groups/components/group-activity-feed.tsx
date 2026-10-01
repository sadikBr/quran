"use client";

import { Activity, BookMarked, ChevronDown, Send, Video } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { GroupActivityItem } from "../server/get-group-activity";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";

export default function GroupActivityFeed({
    activity,
    currentUserId,
    groupId,
    isAdmin,
    locale,
    timezone,
}: {
    activity: GroupActivityItem[];
    currentUserId: string;
    groupId: string;
    isAdmin: boolean;
    locale: string;
    timezone: string;
}) {
    const t = useTranslations("Groups.activity");
    const formatTimestamp = (value: Date) =>
        new Intl.DateTimeFormat(locale, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZone: getMeetingDisplayTimezone(timezone, value),
        }).format(value);

    return (
        <section className="mt-10">
            <details className="group/activity overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5 [&::-webkit-details-marker]:hidden">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Activity aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold">{t("title")}</h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                            {t("description")}
                        </p>
                    </div>
                    <ChevronDown
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-open/activity:rotate-180"
                    />
                </summary>

                <div className="border-border/50 border-t bg-muted/20 px-4 py-3 sm:px-5">
                    {activity.length === 0 ? (
                        <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                            {t("empty")}
                        </p>
                    ) : (
                        <ol className="relative space-y-1 before:absolute before:inset-y-5 before:start-[1.12rem] before:w-px before:bg-border/70">
                            {activity.map((item) => {
                                const Icon =
                                    item.type === "assignment"
                                        ? BookMarked
                                        : item.type === "submission"
                                          ? Send
                                          : Video;
                                const memberName =
                                    item.type === "meeting"
                                        ? ""
                                        : item.memberId === currentUserId
                                          ? t("you")
                                          : item.memberName;
                                const isCurrentUser =
                                    item.type !== "meeting" &&
                                    item.memberId === currentUserId;
                                const href =
                                    item.type === "meeting"
                                        ? `/groups/${groupId}/history`
                                        : item.type === "submission" && isAdmin
                                          ? `/groups/${groupId}/review/${item.assignmentId}`
                                          : isCurrentUser
                                            ? `/practice/${item.assignmentId}/read`
                                            : `/assignments?view=manage&group=${groupId}`;

                                return (
                                    <li key={item.id} className="relative">
                                        <Link
                                            href={href}
                                            className="flex gap-3 rounded-2xl px-1 py-3 outline-none transition-colors hover:bg-muted/35 focus-visible:ring-2 focus-visible:ring-ring sm:gap-4"
                                        >
                                            <span className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm ring-1 ring-border/60">
                                                <Icon className="size-4" />
                                            </span>
                                            <div className="min-w-0 flex-1 pt-0.5">
                                                <p className="text-sm font-medium leading-6">
                                                    {item.type === "meeting"
                                                        ? t("meeting", {
                                                              count: item.participantCount,
                                                          })
                                                        : item.type ===
                                                            "submission"
                                                          ? t(
                                                                isCurrentUser
                                                                    ? "submissionSelf"
                                                                    : "submission",
                                                                {
                                                                    name: memberName,
                                                                },
                                                            )
                                                          : t(
                                                                isCurrentUser
                                                                    ? "assignmentSelf"
                                                                    : "assignment",
                                                                {
                                                                    name: memberName,
                                                                    kind: t(
                                                                        `kinds.${item.kind}`,
                                                                    ),
                                                                },
                                                            )}
                                                </p>
                                                <time
                                                    dateTime={item.occurredAt.toISOString()}
                                                    className="mt-0.5 block text-xs text-muted-foreground"
                                                >
                                                    {formatTimestamp(
                                                        item.occurredAt,
                                                    )}
                                                </time>
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </details>
        </section>
    );
}
