"use client";

import { Clock3, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MeetingScheduleSlot } from "../meeting-types";

export default function MeetingScheduleFields({
    schedule,
    setSchedule,
    timezone,
    setTimezone,
    disabled = false,
}: {
    schedule: MeetingScheduleSlot[];
    setSchedule: (schedule: MeetingScheduleSlot[]) => void;
    timezone: string;
    setTimezone: (timezone: string) => void;
    disabled?: boolean;
}) {
    const t = useTranslations("Groups.meeting");

    useEffect(() => {
        if (timezone) return;
        setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    }, [setTimezone, timezone]);

    function updateSlot(index: number, update: Partial<MeetingScheduleSlot>) {
        setSchedule(
            schedule.map((slot, slotIndex) =>
                slotIndex === index ? { ...slot, ...update } : slot,
            ),
        );
    }

    return (
        <fieldset disabled={disabled} className="space-y-5">
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Clock3 aria-hidden="true" className="size-4.5" />
                </span>
                <div>
                    <legend className="font-semibold">
                        {t("scheduleTitle")}
                    </legend>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {t("scheduleDescription")}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                {schedule.map((slot, index) => (
                    <div
                        key={`${index}-${slot.weekday}`}
                        className="grid grid-cols-[minmax(0,1fr)_7.75rem_auto] items-center gap-2 sm:grid-cols-[minmax(12rem,1fr)_9rem_auto]"
                    >
                        <select
                            aria-label={t("day")}
                            value={slot.weekday}
                            onChange={(event) =>
                                updateSlot(index, {
                                    weekday: Number(event.target.value),
                                })
                            }
                            className="h-11 rounded-xl border-0 bg-background/80 px-3 text-sm shadow-sm ring-1 ring-border/60 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
                                <option key={weekday} value={weekday}>
                                    {t(`weekdays.${weekday}`)}
                                </option>
                            ))}
                        </select>
                        <Input
                            type="time"
                            lang="en-GB"
                            dir="ltr"
                            aria-label={t("time")}
                            required
                            value={slot.localTime}
                            onChange={(event) =>
                                updateSlot(index, {
                                    localTime: event.target.value,
                                })
                            }
                            className="h-11 rounded-xl border-0 bg-background/80 text-left shadow-sm ring-1 ring-border/60"
                        />
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={schedule.length === 1}
                            aria-label={t("removeSlot")}
                            onClick={() =>
                                setSchedule(
                                    schedule.filter(
                                        (_, slotIndex) => slotIndex !== index,
                                    ),
                                )
                            }
                            className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={schedule.length >= 14}
                onClick={() =>
                    setSchedule([
                        ...schedule,
                        { weekday: 1, localTime: "20:00" },
                    ])
                }
                className="rounded-lg text-primary hover:text-primary"
            >
                <Plus className="size-4" />
                {t("addSlot")}
            </Button>

            <div>
                <Label htmlFor="meeting-timezone">{t("timezone")}</Label>
                <Input
                    id="meeting-timezone"
                    required
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder="Africa/Casablanca"
                    className="mt-2 h-11 rounded-xl border-0 bg-background/80 shadow-sm ring-1 ring-border/60 ltr:text-left"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("timezoneHint")}
                </p>
            </div>
        </fieldset>
    );
}
