"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import usePlanEditor from "@/features/learning/components/use-plan-editor";
import {
    PlanOverview,
    PlanPreview,
    type PlanSessionItem,
    PlanSessions,
    PlanSetupNotice,
    type PlanSurah,
    usePlanFormatting,
} from "@/features/learning/components/weekly-plan-ui";
import type { RevisionSettings } from "../schedule";
import {
    deleteWeeklyRevision,
    pauseWeeklyRevision,
    previewWeeklyRevision,
    saveWeeklyRevision,
} from "../server/actions";
import type { RevisionPreview, RevisionView } from "../server/service";
import RevisionPlanSettings from "./revision-plan-settings";
import RevisionRotationSummary from "./revision-rotation";

export default function WeeklyRevision({
    view,
    defaultTimezone,
    defaultRiwayah,
    surahs,
    revisionDays,
}: {
    view: RevisionView;
    defaultTimezone: string;
    defaultRiwayah: "hafs" | "warsh";
    surahs: PlanSurah[];
    revisionDays: number[];
}) {
    const t = useTranslations("Memorization.weekly");
    const common = useTranslations("Memorization.plans");
    const editor = usePlanEditor<RevisionSettings, RevisionPreview>({
        savedSettings: {
            days: revisionDays,
            quartersPerDay: (view.plan?.quartersPerDay ?? 2) as 1 | 2 | 4,
            timezone: view.plan?.timezone ?? defaultTimezone,
            riwayah: view.plan?.riwayah ?? defaultRiwayah,
            reminderTime: view.plan?.reminderTime ?? null,
        },
        revision: view.plan?.revision ?? 0,
        days: revisionDays,
        failed: common("failed"),
    });
    const settings = { ...editor.settings, days: revisionDays };
    const { range } = usePlanFormatting(surahs);
    const eligible = view.sessions.filter((s) => s.available || s.done);
    const items: PlanSessionItem[] = view.sessions.map((item) => ({
        id: item.id,
        scheduledDate: item.scheduledDate,
        originalScheduledDate: item.originalScheduledDate,
        range: range(item),
        href:
            view.plan?.enabled &&
            item.active &&
            !item.done &&
            item.scheduledDate === view.today &&
            item.available
                ? `/practice/revision/${item.id}/read`
                : undefined,
        action: common(
            item.progressSurahNumber && item.progressAyahNumber
                ? "continue"
                : "open",
        ),
        amount: t("ayahCount", { count: item.total }),
        state: item.done
            ? item.outcome === "difficult"
                ? "difficult"
                : "complete"
            : !item.available
              ? "unavailable"
              : !view.plan?.enabled
                ? "paused"
                : "ready",
        description:
            !item.done && item.available && !item.scheduledDate
                ? common("noStudyDays")
                : t(
                      item.done
                          ? item.outcome === "difficult"
                              ? "difficultSaved"
                              : item.completedAt
                                ? "comfortableSaved"
                                : "peerDone"
                          : !item.available
                            ? "removed"
                            : "planned",
                  ),
        coverage:
            item.peer > 0
                ? t("peerCredit", { count: item.peer, total: item.total })
                : undefined,
    }));
    async function save() {
        if (!editor.preview) return;
        const result = await saveWeeklyRevision({
            settings,
            key: editor.preview.key,
            confirmed: true,
            regenerate: editor.regenerating,
        });
        if (!result.success) {
            toast.error(common(result.reason === "stale" ? "stale" : "failed"));
            editor.setPreview(null);
        } else {
            toast.success(common("saved"));
            editor.cancel();
            editor.refresh();
        }
    }
    return (
        <div className="mt-6 space-y-6">
            {!view.setup ? (
                <PlanSetupNotice />
            ) : (
                <>
                    <PlanOverview
                        title={t(view.plan ? "thisWeek" : "optIn")}
                        description={t("stableWeek")}
                        plan={view.plan}
                        week={view.week}
                        done={eligible.filter((s) => s.done).length}
                        total={eligible.length}
                        editing={editor.editing}
                        pending={editor.pending}
                        onEdit={editor.toggle}
                        version={view.version}
                        onRegenerate={editor.startRegeneration}
                        onDelete={(version) =>
                            editor.act(async () => {
                                const result = await deleteWeeklyRevision({
                                    version,
                                    confirmed: true,
                                });
                                if (!result.success) {
                                    toast.error(
                                        common(
                                            result.reason === "stale"
                                                ? "deleteStale"
                                                : "failed",
                                        ),
                                    );
                                    editor.refresh();
                                    return false;
                                }
                                editor.cancel();
                                toast.success(common("deleted"));
                                editor.refresh();
                                return true;
                            })
                        }
                        notice={
                            view.memorizedAyahs === 0
                                ? t("noMemorization")
                                : undefined
                        }
                        onPause={() =>
                            editor.act(async () => {
                                const result = await pauseWeeklyRevision({
                                    revision: view.plan?.revision,
                                });
                                if (!result.success)
                                    toast.error(common("failed"));
                                else {
                                    editor.cancel();
                                    toast.success(common("pauseSaved"));
                                    editor.refresh();
                                }
                            })
                        }
                    />
                    {view.rotation && (
                        <RevisionRotationSummary
                            rotation={view.rotation}
                            surahs={surahs}
                            paused={!view.plan?.enabled}
                        />
                    )}
                    {editor.editing && (
                        <>
                            <RevisionPlanSettings
                                settings={settings}
                                pending={editor.pending}
                                hasPlan={Boolean(view.plan)}
                                regenerating={editor.regenerating}
                                onChange={editor.change}
                                onCancel={editor.cancel}
                                onPreview={() =>
                                    editor.act(async () => {
                                        const result =
                                            await previewWeeklyRevision(
                                                settings,
                                                editor.regenerating,
                                            );
                                        if (result.success)
                                            editor.setPreview(result.preview);
                                        else toast.error(common("invalid"));
                                    })
                                }
                            />
                            {editor.preview && (
                                <PlanPreview
                                    kind="revision"
                                    preview={editor.preview}
                                    surahs={surahs}
                                    emptyMessage={t(
                                        editor.preview.ready
                                            ? "noDaysLeft"
                                            : "noMemorization",
                                    )}
                                    hint={t("capacityHint")}
                                    pending={editor.pending}
                                    enabled={Boolean(view.plan?.enabled)}
                                    hasPlan={Boolean(view.plan)}
                                    onSave={() => editor.act(save)}
                                />
                            )}
                        </>
                    )}
                    {view.plan && (
                        <PlanSessions
                            items={items}
                            today={view.today}
                            emptyMessage={
                                view.memorizedAyahs === 0
                                    ? t("noMemorization")
                                    : !revisionDays.length
                                      ? common("noStudyDays")
                                      : t("noDaysLeft")
                            }
                        />
                    )}
                </>
            )}
        </div>
    );
}
