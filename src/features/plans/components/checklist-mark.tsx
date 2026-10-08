"use client";

import { Check, Circle, LoaderCircle, Minus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";
import type { TodayTask } from "../daily-checklist";
import { setPersonalOccurrence } from "../server/actions";

function Mark({
    checked,
    skipped,
    pending,
    label,
    onChange,
}: {
    checked: boolean;
    skipped?: boolean;
    pending?: boolean;
    label: string;
    onChange?: () => void;
}) {
    const Icon = pending
        ? LoaderCircle
        : skipped
          ? Minus
          : checked
            ? Check
            : Circle;
    const className = `flex size-11 shrink-0 items-center justify-center rounded-full ${checked ? "bg-primary/10 text-primary" : "text-muted-foreground"}`;
    if (!onChange)
        return (
            <span className={className} role="img" aria-label={label}>
                <Icon className="size-5" aria-hidden="true" />
            </span>
        );
    return (
        <span
            className={`${className} relative hover:bg-primary/10 focus-within:ring-2 focus-within:ring-ring ${pending ? "opacity-60" : ""}`}
        >
            <input
                type="checkbox"
                checked={checked}
                aria-label={label}
                disabled={pending}
                onChange={onChange}
                className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-wait"
            />
            <Icon
                className={`size-5 ${pending ? "animate-spin" : ""}`}
                aria-hidden="true"
            />
        </span>
    );
}

function RecurringMark({ task, name }: { task: TodayTask; name: string }) {
    const t = useTranslations("Plans.checklist");
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const occurrence = task.recurring;
    return (
        <Mark
            checked={task.done && !task.skipped}
            skipped={task.skipped}
            pending={pending}
            label={t(task.done ? "uncheck" : "check", { name })}
            onChange={
                occurrence?.actionable
                    ? () =>
                          startTransition(async () => {
                              try {
                                  const result = await setPersonalOccurrence({
                                      id: occurrence.planId,
                                      revision: occurrence.revision,
                                      date: occurrence.date,
                                      status: task.done
                                          ? "pending"
                                          : "completed",
                                  });
                                  if (!result.success)
                                      toast.error(
                                          t(
                                              `errors.${result.reason === "date" || result.reason === "stale" ? result.reason : "failed"}`,
                                          ),
                                      );
                                  router.refresh();
                              } catch {
                                  toast.error(t("errors.failed"));
                              }
                          })
                    : undefined
            }
        />
    );
}

export default function ChecklistMark({
    task,
    name,
}: {
    task: TodayTask;
    name: string;
}) {
    const t = useTranslations("Plans");
    if (task.recurring) return <RecurringMark task={task} name={name} />;
    return (
        <Mark
            checked={task.done}
            label={t(
                task.submitted
                    ? "checklist.submitted"
                    : task.done
                      ? "completed"
                      : "checklist.pending",
            )}
        />
    );
}
