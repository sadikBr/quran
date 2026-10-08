"use client";

import { ArrowRight, LoaderCircle, MoonStar } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { ADHKAR } from "@/features/adhkar/catalog";
import type { DailyAdhkarCompletion } from "../daily-checklist";
import useAdhkarCompletion from "./use-adhkar-completion";

function AdhkarRow({
    item,
    editable,
    horizontal,
}: {
    item: DailyAdhkarCompletion;
    editable: boolean;
    horizontal: boolean;
}) {
    const t = useTranslations("Plans.checklist");
    const locale = useLocale();
    const id = useId();
    const { completed, pending, error, save } = useAdhkarCompletion(item);
    const name = ADHKAR[item.category][locale === "ar" ? "ar" : "en"];
    return (
        <li
            className={
                horizontal ? "min-w-0 rounded-lg bg-muted/35 px-2" : undefined
            }
        >
            <div className="flex items-center gap-2">
                <label
                    htmlFor={id}
                    className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg px-1 text-sm ${editable ? "cursor-pointer" : "text-muted-foreground"}`}
                >
                    <input
                        id={id}
                        type="checkbox"
                        checked={completed}
                        disabled={!editable || pending}
                        aria-label={name}
                        onChange={(event) => save(event.target.checked)}
                        className="size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-default"
                    />
                    <span className={completed ? "text-primary" : ""}>
                        {t(`adhkarLabels.${item.category}`)}
                    </span>
                    {pending && (
                        <LoaderCircle
                            className="size-3.5 shrink-0 animate-spin text-primary"
                            aria-label={t("saving")}
                        />
                    )}
                </label>
                {editable && (
                    <Link
                        href={`/azkar?category=${item.category}&from=today`}
                        aria-label={t("readAdhkar", { name })}
                        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-primary"
                    >
                        <ArrowRight
                            className="size-4 rtl:rotate-180"
                            aria-hidden="true"
                        />
                    </Link>
                )}
            </div>
            {error && (
                <p
                    role="alert"
                    className="px-1 pb-2 text-xs leading-6 text-destructive"
                >
                    {t(`errors.${error}`)}
                </p>
            )}
        </li>
    );
}

export default function AdhkarChecklistCard({
    items,
    mode = "today",
    disabled = false,
    horizontal = false,
}: {
    items: DailyAdhkarCompletion[];
    mode?: "today" | "past" | "future";
    disabled?: boolean;
    horizontal?: boolean;
}) {
    const t = useTranslations("Plans.checklist");
    const heading = useId();
    if (!items.length) return null;
    return (
        <section
            aria-labelledby={heading}
            className="rounded-xl border border-border/65 bg-card p-3 sm:p-4"
        >
            <div className="mb-2 flex items-center gap-2 border-b border-border/40 pb-3">
                <MoonStar className="size-4 text-primary" aria-hidden="true" />
                <h4 id={heading} className="text-sm font-semibold">
                    {t("adhkar")}
                </h4>
            </div>
            <ul
                className={
                    horizontal
                        ? "grid gap-2 sm:auto-cols-fr sm:grid-flow-col"
                        : "divide-y divide-border/30"
                }
            >
                {items.map((item) => (
                    <AdhkarRow
                        key={`${item.date}:${item.category}`}
                        item={item}
                        editable={mode === "today" && !disabled}
                        horizontal={horizontal}
                    />
                ))}
            </ul>
            {(mode !== "today" || disabled) && (
                <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                    {t(
                        disabled && mode === "today"
                            ? "adhkarSaveWeek"
                            : mode === "past"
                              ? "adhkarPast"
                              : "adhkarFuture",
                    )}
                </p>
            )}
        </section>
    );
}
