"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { MemorizationSettings } from "../schedule";
import {
    deleteWeeklyMemorization,
    pauseWeeklyMemorization,
    previewWeeklyMemorization,
    saveWeeklyMemorization,
} from "../server/actions";
import type {
    MemorizationPlanView,
    MemorizationPreview,
} from "../server/service";
import MemorizationPlanSettings from "./memorization-plan-settings";
import usePlanEditor from "./use-plan-editor";
import {
    PlanOverview,
    PlanPreview,
    type PlanSessionItem,
    PlanSessions,
    PlanSetupNotice,
    type PlanSurah,
    usePlanFormatting,
} from "./weekly-plan-ui";

export default function WeeklyMemorization({
    view,
    memorizationDays,
    defaultTimezone,
    defaultRiwayah,
    surahs,
}: {
    view: MemorizationPlanView;
    memorizationDays: number[];
    defaultTimezone: string;
    defaultRiwayah: "hafs" | "warsh";
    surahs: PlanSurah[];
}) {
    const t = useTranslations("Memorization.learning");
    const common = useTranslations("Memorization.plans");
    const editor = usePlanEditor<MemorizationSettings, MemorizationPreview>({
        savedSettings: view.plan ?? {
            quartersPerWeek: 1,
            startQuarter: view.firstUnmemorizedQuarter,
            direction: "forward",
            timezone: defaultTimezone,
            riwayah: defaultRiwayah,
        },
        revision: view.plan?.revision ?? 0,
        days: memorizationDays,
        failed: common("failed"),
    });
    const { range } = usePlanFormatting(surahs);
    const items: PlanSessionItem[] = view.sessions.map((item) => ({
        id: item.id,
        scheduledDate: item.scheduledDate,
        originalScheduledDate: item.originalScheduledDate,
        range: range(item),
        href:
            view.plan?.enabled &&
            item.active &&
            !item.done &&
            item.scheduledDate === view.today
                ? `/practice/memorization/${item.id}/read`
                : undefined,
        action: common(
            item.progressSurahNumber && item.progressAyahNumber
                ? "continue"
                : "open",
        ),
        state: item.done
            ? "complete"
            : !view.plan?.enabled
              ? "paused"
              : "ready",
        description:
            !item.done && !item.scheduledDate
                ? common("noStudyDays")
                : t(item.done ? "done" : "sessionHint"),
        coverage: t("coverage", {
            completed: item.completed,
            total: item.total,
        }),
    }));
    async function save() {
        if (!editor.preview) return;
        const result = await saveWeeklyMemorization({
            settings: editor.settings,
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
                        description={t("progressHint")}
                        plan={view.plan}
                        week={view.week}
                        done={view.sessions.filter((s) => s.done).length}
                        total={view.sessions.length}
                        editing={editor.editing}
                        pending={editor.pending}
                        onEdit={editor.toggle}
                        version={view.version}
                        onRegenerate={editor.startRegeneration}
                        onDelete={(version) =>
                            editor.act(async () => {
                                const result = await deleteWeeklyMemorization({
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
                        onPause={() =>
                            editor.act(async () => {
                                const result = await pauseWeeklyMemorization({
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
                    {editor.editing && (
                        <>
                            <MemorizationPlanSettings
                                settings={editor.settings}
                                days={memorizationDays}
                                quarterStarts={view.quarterStarts}
                                surahs={surahs}
                                pending={editor.pending}
                                hasPlan={Boolean(view.plan)}
                                regenerating={editor.regenerating}
                                onChange={editor.change}
                                onCancel={editor.cancel}
                                onPreview={() =>
                                    editor.act(async () => {
                                        const result =
                                            await previewWeeklyMemorization(
                                                editor.settings,
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
                                    kind="memorization"
                                    preview={editor.preview}
                                    surahs={surahs}
                                    emptyMessage={t("empty")}
                                    hint={t("splitHint")}
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
                                !memorizationDays.length
                                    ? common("noStudyDays")
                                    : t("empty")
                            }
                        />
                    )}
                </>
            )}
        </div>
    );
}
