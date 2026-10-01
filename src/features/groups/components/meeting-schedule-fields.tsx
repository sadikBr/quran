"use client";

import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId } from "react";
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
    showHeading = true,
}: {
    schedule: MeetingScheduleSlot[];
    setSchedule: (schedule: MeetingScheduleSlot[]) => void;
    timezone: string;
    setTimezone: (timezone: string) => void;
    disabled?: boolean;
    showHeading?: boolean;
}) {
    const t = useTranslations("Groups.meeting");
    const fieldId = useId();

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
            <legend className={showHeading ? "mb-2 font-semibold" : "sr-only"}>
                {t("scheduleTitle")}
            </legend>
            {showHeading && (
                <p className="text-sm leading-6 text-muted-foreground">
                    {t("scheduleDescription")}
                </p>
            )}
            <div className="space-y-3">
                {schedule.map((slot, index) => (
                    <div
                        key={`${index}-${slot.weekday}`}
                        className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-3 rounded-xl border border-border/60 bg-muted/20 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.75rem]"
                    >
                        <div className="col-span-2 space-y-2 sm:col-span-1">
                            <Label htmlFor={`${fieldId}-day-${index}`}>
                                {t("day")}
                            </Label>
                            <select
                                id={`${fieldId}-day-${index}`}
                                value={slot.weekday}
                                onChange={(event) =>
                                    updateSlot(index, {
                                        weekday: Number(event.target.value),
                                    })
                                }
                                className="h-11 w-full min-w-0 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {[1, 2, 3, 4, 5, 6, 7].map((weekday) => (
                                    <option key={weekday} value={weekday}>
                                        {t(`weekdays.${weekday}`)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="min-w-0 space-y-2">
                            <Label htmlFor={`${fieldId}-time-${index}`}>
                                {t("time")}
                            </Label>
                            <Input
                                id={`${fieldId}-time-${index}`}
                                type="time"
                                lang="en-GB"
                                dir="ltr"
                                required
                                value={slot.localTime}
                                onChange={(event) =>
                                    updateSlot(index, {
                                        localTime: event.target.value,
                                    })
                                }
                                className="bg-background text-left"
                            />
                        </div>
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
                            className="size-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
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
                className="min-h-11 rounded-xl text-primary hover:text-primary"
            >
                <Plus className="size-4" />
                {t("addSlot")}
            </Button>

            <div>
                <Label htmlFor={`${fieldId}-timezone`}>{t("timezone")}</Label>
                <Input
                    id={`${fieldId}-timezone`}
                    required
                    value={timezone}
                    onChange={(event) => setTimezone(event.target.value)}
                    placeholder="Africa/Casablanca"
                    dir="ltr"
                    className="mt-2 bg-background text-left"
                />
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {t("timezoneHint")}
                </p>
            </div>
        </fieldset>
    );
}
