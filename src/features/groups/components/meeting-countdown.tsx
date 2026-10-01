"use client";

import { Clock3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function MeetingCountdown({ startsAt }: { startsAt: string }) {
    const t = useTranslations("Groups.meeting");
    const locale = useLocale();
    // Render the same initial markup on the server and client.
    const [now, setNow] = useState<number | null>(null);
    useEffect(() => {
        const update = () => setNow(Date.now());
        update();
        const timer = window.setInterval(update, 1_000);
        window.addEventListener("focus", update);
        return () => {
            window.clearInterval(timer);
            window.removeEventListener("focus", update);
        };
    }, []);

    const target = new Date(startsAt).getTime();
    if (now === null || !Number.isFinite(target)) return null;
    const milliseconds = target - now;
    const totalMinutes = Math.floor(Math.max(0, milliseconds) / 60_000);
    const days = Math.floor(totalMinutes / 1_440);
    const hours = Math.floor((totalMinutes % 1_440) / 60);
    const minutes = totalMinutes % 60;
    const parts = [
        days > 0 ? t("countdownDays", { count: days }) : null,
        hours > 0 ? t("countdownHours", { count: hours }) : null,
        minutes > 0 ? t("countdownMinutes", { count: minutes }) : null,
    ].filter((part): part is string => part !== null);
    const label =
        milliseconds <= 0
            ? t("countdownNow")
            : totalMinutes === 0
              ? t("countdownSoon")
              : t("countdownStartsIn", {
                    duration: new Intl.ListFormat(locale, {
                        style: "long",
                        type: "conjunction",
                    }).format(parts),
                });

    return (
        <p className="flex min-w-0 items-start gap-2.5 text-sm font-semibold leading-6 text-primary tabular-nums">
            <Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0" />
            <span>{label}</span>
        </p>
    );
}
