"use client";

import { useLocale } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import type { Preferences } from "@/features/settings/preferences";

type Key = "morningAdhkarTime" | "eveningAdhkarTime" | "sleepAdhkarTime";
export default function AdhkarReminderSettings({
    values,
    onChange,
}: {
    values: Preferences;
    onChange: <K extends keyof Preferences>(
        key: K,
        value: Preferences[K],
    ) => void;
}) {
    const ar = useLocale() === "ar";
    return (
        <section id="adhkar-reminders" className="scroll-mt-24 space-y-4">
            <div>
                <h3 className="font-semibold">
                    {ar ? "تذكيرات الأذكار" : "Adhkar reminders"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {ar
                        ? "اختر وقتًا لكل تذكير ثم احفظ الإعدادات. فعّل إشعارات هذا الجهاز أعلاه لتصلك التذكيرات حتى عند إغلاق التطبيق. قد يتأخر وصولها بحسب اتصال الجهاز."
                        : "Choose a time for each reminder, then save settings. Enable notifications above to receive reminders even when the app is closed. Delivery may be delayed by device connectivity."}
                </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                    [
                        "morningAdhkarTime",
                        "eveningAdhkarTime",
                        "sleepAdhkarTime",
                    ] as Key[]
                ).map((key) => (
                    <div
                        key={key}
                        className="rounded-xl border bg-background/40 p-4"
                    >
                        <label
                            className="flex min-h-11 items-center gap-3"
                            htmlFor={`${key}-enabled`}
                        >
                            <Checkbox
                                id={`${key}-enabled`}
                                checked={values[key] !== null}
                                onCheckedChange={(checked) =>
                                    onChange(
                                        key,
                                        checked === true
                                            ? key === "morningAdhkarTime"
                                                ? "07:00"
                                                : key === "sleepAdhkarTime"
                                                  ? "22:00"
                                                  : "18:00"
                                            : null,
                                    )
                                }
                            />
                            <span>
                                {key === "morningAdhkarTime"
                                    ? ar
                                        ? "أذكار الصباح"
                                        : "Morning adhkar"
                                    : key === "sleepAdhkarTime"
                                      ? ar
                                          ? "أذكار النوم"
                                          : "Bedtime adhkar"
                                      : ar
                                        ? "أذكار المساء"
                                        : "Evening adhkar"}
                            </span>
                        </label>
                        <label className="sr-only" htmlFor={key}>
                            {ar ? "وقت التذكير" : "Reminder time"}
                        </label>
                        <input
                            id={key}
                            type="time"
                            dir="ltr"
                            required={values[key] !== null}
                            disabled={values[key] === null}
                            value={values[key] ?? ""}
                            onChange={(event) =>
                                onChange(key, event.target.value)
                            }
                            className="mt-2 h-11 w-full rounded-lg border bg-background px-3 disabled:opacity-40"
                        />
                    </div>
                ))}
            </div>
            <label className="block text-sm" htmlFor="adhkar-timezone">
                {ar ? "المنطقة الزمنية للتذكيرات" : "Reminder timezone"}
            </label>
            <div className="flex flex-wrap gap-2">
                <input
                    id="adhkar-timezone"
                    dir="ltr"
                    required
                    value={values.adhkarTimezone}
                    onChange={(event) =>
                        onChange("adhkarTimezone", event.target.value)
                    }
                    className="h-11 min-w-0 flex-1 rounded-lg border bg-background px-3"
                    placeholder="Africa/Casablanca"
                />
                <button
                    type="button"
                    className="min-h-11 rounded-lg border px-3 text-sm hover:bg-muted"
                    onClick={() =>
                        onChange(
                            "adhkarTimezone",
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                        )
                    }
                >
                    {ar ? "استخدام توقيت الجهاز" : "Use device timezone"}
                </button>
            </div>
            <p className="text-xs text-muted-foreground">
                {ar
                    ? "الأوقات حسب المنطقة المحدّدة، وليست مرتبطة بمواقيت الصلاة. يمكنك إيقاف كل تذكير على حدة."
                    : "Times follow the selected timezone, not prayer times. Each reminder can be disabled separately."}
            </p>
        </section>
    );
}
