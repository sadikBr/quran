"use client";

import { Activity, BookMarked, Send, Video } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GroupActivityItem } from "../server/get-group-activity";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";

export default function GroupActivityFeed({
    activity,
    currentUserId,
    locale,
    timezone,
}: {
    activity: GroupActivityItem[];
    currentUserId: string;
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
        <section className="mt-10 rounded-3xl bg-muted/25 p-5 ring-1 ring-border/50 sm:p-7">
            <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Activity className="size-5" />
                </span>
                <div>
                    <h2 className="text-lg font-semibold">{t("title")}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t("description")}
                    </p>
                </div>
            </div>

            {activity.length === 0 ? (
                <p className="mt-6 rounded-2xl bg-background/55 px-4 py-6 text-center text-sm text-muted-foreground ring-1 ring-border/40">
                    {t("empty")}
                </p>
            ) : (
                <ol className="relative mt-6 space-y-1 before:absolute before:inset-y-5 before:start-[1.12rem] before:w-px before:bg-border/70">
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

                        return (
                            <li
                                key={item.id}
                                className="relative flex gap-3 rounded-2xl px-1 py-3 sm:gap-4"
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
                                            : item.type === "submission"
                                              ? t(
                                                    isCurrentUser
                                                        ? "submissionSelf"
                                                        : "submission",
                                                    { name: memberName },
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
                                    <time className="mt-0.5 block text-xs text-muted-foreground">
                                        {formatTimestamp(item.occurredAt)}
                                    </time>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
}
