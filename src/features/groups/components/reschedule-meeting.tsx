"use client";

import { DateTime } from "luxon";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getMeetingDisplayTimezone } from "../server/meeting-schedule";
import rescheduleMeeting from "../server/reschedule-meeting";

export default function RescheduleMeeting({
    groupId,
    startsAt,
    timezone,
}: {
    groupId: string;
    startsAt: string;
    timezone: string;
}) {
    const t = useTranslations("Groups.meeting");
    const router = useRouter();
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <details className="border-t border-border/50 p-4 sm:px-6">
            <summary className="cursor-pointer text-sm font-medium text-primary">
                {t("rescheduleOne")}
            </summary>
            <form
                className="mt-3 space-y-3"
                onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy) return;
                    const candidate = new Date(`${value}Z`);
                    if (Number.isNaN(candidate.getTime())) return;
                    const date = DateTime.fromISO(value, {
                        zone: getMeetingDisplayTimezone(timezone, candidate),
                    });
                    if (
                        !date.isValid ||
                        date.toFormat("yyyy-MM-dd'T'HH:mm") !== value
                    ) {
                        toast.error(t("rescheduleError"));
                        return;
                    }
                    setBusy(true);
                    try {
                        const result = await rescheduleMeeting({
                            groupId,
                            from: startsAt,
                            to: date.toUTC().toISO(),
                        });
                        if (!result.success) {
                            toast.error(t("rescheduleError"));
                            return;
                        }
                        toast.success(t("saved"));
                        setValue("");
                        router.refresh();
                    } catch {
                        toast.error(t("rescheduleError"));
                    } finally {
                        setBusy(false);
                    }
                }}
            >
                <p className="text-sm text-muted-foreground">
                    {t("rescheduleHint")}
                </p>
                <label className="block space-y-1 text-sm">
                    {t("newTime", { timezone })}
                    <input
                        type="datetime-local"
                        required
                        value={value}
                        onChange={(event) => setValue(event.target.value)}
                        disabled={busy}
                        className="block min-h-11 rounded-xl border bg-background px-3"
                    />
                </label>
                <Button disabled={busy || !value}>{t("rescheduleOne")}</Button>
            </form>
        </details>
    );
}
